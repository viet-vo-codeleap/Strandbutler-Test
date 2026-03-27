# B2C Load Tests — Local Run Instructions

**Tool:** [k6](https://k6.io)
**Target:** `http://strandbutler-test-alb-838959981.eu-west-2.elb.amazonaws.com` (test env, hardcoded in `load-tests/k6/utils/config.js`)

> **Why local only?**
> The test environment backend enforces IP-based rate limiting. GitHub Actions runner IPs cannot be whitelisted. All tests must be run from a trusted machine — typically a developer laptop on the office network or VPN.

---

## Prerequisites

```bash
# Install k6 (macOS)
brew install k6

# Install k6 (Ubuntu/Debian)
sudo gpg --no-default-keyring \
  --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Verify
k6 version
```

Node.js 20+ is required only for the post-run analyzer (`analyze-stress-output.js`).

---

## Test Scripts

All scripts live in `load-tests/k6/b2c/`. Run from the repo root.

| Script | What it tests | Duration |
|---|---|---|
| `smoke-test.js` | All endpoints alive, single VU, no load | ~30 s |
| `case1-average-load.js` | Normal weekday — floor baseline, 1 task, no scaling | ~10 min |
| `case2-peak-hour.js` | Busiest regular hour, 1 task should hold without scaling | ~10 min |
| `case3-spike.js` | Sudden viral burst — ECS cannot pre-scale, measure recovery | ~7 min |
| `case4-sustained-load.js` | Full daily load in 10 min — validates ECS scale-out cycle | ~15 min |
| `stress-test.js` | Gradual ramp to find the breaking point | ~17 min |

**Always run the smoke test first.** If smoke fails, stop — do not proceed to load tests.

---

## Quick Start

```bash
# 1. Smoke — run after every deployment or env change
k6 run load-tests/k6/b2c/smoke-test.js

# 2. Average load (Case 1) — default 28 iter/min
k6 run load-tests/k6/b2c/case1-average-load.js

# 3. Peak hour (Case 2) — default 83 iter/min
k6 run load-tests/k6/b2c/case2-peak-hour.js

# 4. Spike (Case 3) — default 1000 iter/min burst
k6 run load-tests/k6/b2c/case3-spike.js

# 5. Sustained load (Case 4) — default 1000 iter/min
k6 run load-tests/k6/b2c/case4-sustained-load.js

# 6. Stress — gradual ramp to breaking point
k6 run load-tests/k6/b2c/stress-test.js
```

---

## Overriding Arrival Rates

Each script accepts an environment variable to change the arrival rate without editing the file.

| Script | Env var | Unit | Default | Example |
|---|---|---|---|---|
| `case1-average-load.js` | `TARGET_RATE` | iter/min | `28` | `--env TARGET_RATE=50` |
| `case2-peak-hour.js` | `TARGET_RATE` | iter/min | `83` | `--env TARGET_RATE=100` |
| `case3-spike.js` | `BURST_RATE` | iter/min | `1000` | `--env BURST_RATE=600` |
| `case4-sustained-load.js` | `SUSTAIN_RATE` | iter/min | `1000` | `--env SUSTAIN_RATE=600` |
| `stress-test.js` | `PEAK_RATE` | iter/min | `1800` | `--env PEAK_RATE=3600` |

```bash
# Example: run Case 2 at 100 iter/min instead of the default 83
k6 run --env TARGET_RATE=100 load-tests/k6/b2c/case2-peak-hour.js
```

Rates for `case3` and `case4` are entered in iter/min; the scripts convert to iter/sec internally since they use `timeUnit: '1s'`.

---

## Saving Results

Results are gitignored. Save them to `load-tests/results/` for local analysis:

```bash
mkdir -p load-tests/results

# Save k6 NDJSON output (required for the analyzer)
k6 run \
  --out json=load-tests/results/stress-$(date +%Y%m%d-%H%M%S).ndjson \
  load-tests/k6/b2c/stress-test.js
```

---

## Analyzing Stress Test Results

After running `stress-test.js` with `--out json`, run the post-run analyzer to find per-phase breaking points:

```bash
node load-tests/k6/b2c/analyze-stress-output.js load-tests/results/stress-<timestamp>.ndjson
```

**What the analyzer produces:**

- First individual request to exceed the 2000 ms SLA, per phase, with the stress stage active at that moment
- Approximate p50 / p95 / p99 / min / max per phase (reservoir-sampled across the full run)
- Bottleneck summary: which phase broke first and at what stage rate

The analyzer also works on other test NDJSON files, but is most useful for stress results since it aligns timestamps to the fixed stress stages.

---

## Understanding the Test Phases

Every script (except smoke setup) exercises the same B2C booking flow:

| Phase | Endpoints | SLA |
|---|---|---|
| Phase 2 — Location & Vendor | `GET /api/v1/features/public/vendor` | — |
| Phase 3 — Availability | `GET /api/v1/features/public/sections/:id/beach_chairs_availability` | 2000 ms |
| Phase 4 — Chair & Pricing | `GET /api/v1/bookings/beach-chairs/:id`, `GET /api/v1/prices/calculate`, `GET /api/v1/prices/rates` | — |

Phase 3 (Availability) is the primary performance bottleneck — it hits the DB directly with no cache. Watch its `http_req_waiting` in the k6 dashboard.

---

## Pass Criteria

| Script | p95 | p99 | Error rate |
|---|---|---|---|
| `smoke-test.js` | < 2000 ms | < 5000 ms | 0% |
| `case1-average-load.js` | < 2000 ms | < 5000 ms | < 1% |
| `case2-peak-hour.js` | < 2000 ms | < 5000 ms | < 1% |
| `case3-spike.js` | < 5000 ms overall | — | Errors during burst are expected; watch recovery time |
| `case4-sustained-load.js` | < 2000 ms after T+300s | — | Errors during 5-min provisioning window expected |
| `stress-test.js` | no hard threshold | — | Observation only — find the breaking point |

---

## CloudWatch Correlation

While a test is running, open CloudWatch in a second window and watch:

**ECS** — CloudWatch > Metrics > ECS > ClusterName, ServiceName

| Metric | What to look for |
|---|---|
| `RunningTaskCount` | Does it increase as load ramps? At what timestamp? |
| `CPUUtilization` | At what rate does CPU cross 60% (scale-out threshold)? |

**ALB** — CloudWatch > Metrics > ApplicationELB

| Metric | What to look for |
|---|---|
| `TargetResponseTime` | Should track k6 `http_req_duration` |
| `HTTPCode_Target_5XX_Count` | First 5xx marks the breaking point |
| `RequestCount` | Confirms load is reaching the ALB (scale-out alarm is 5000 req/min per task) |

---

## When to Run Each Test

| Trigger | Test |
|---|---|
| After every deployment or env change | Smoke |
| Confirm service handles normal weekday load | Case 1 — Average Load |
| Before a high-traffic event (campaign, sale) | Case 2 — Peak Hour, then Case 4 — Sustained |
| Validate ECS spike recovery | Case 3 — Spike |
| After ECS / ALB / RDS config changes | Stress — re-establish the breaking point |
| Quarterly capacity review | Full suite: smoke → case1 → case2 → stress → case3 → case4 |
