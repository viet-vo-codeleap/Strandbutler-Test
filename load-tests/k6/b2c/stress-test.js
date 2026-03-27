// load-tests/k6/b2c/stress-test.js
// B2C Stress Test — find the real API breaking point under a steady ramp.
//
// What this does:
//   Gradually increases load until the system breaks. Unlike the spike test (sudden
//   burst), this gives the system time to degrade gracefully so we can identify the
//   exact RPS at which latency and error rate cross the threshold.
//
// How to run with output saved for breaking point analysis:
//   mkdir -p load-tests/results
//   k6 run --out json=load-tests/results/stress-$(date +%Y%m%d-%H%M%S).ndjson load-tests/k6/b2c/stress-test.js
//   node load-tests/k6/b2c/analyze-stress-output.js load-tests/results/stress-<timestamp>.ndjson
//
// Run this WITHOUT auto-scaling active first.
// The result tells you:
//   1. At which RPS does the availability endpoint (Phase 3) first exceed 2000ms?  → degradation point
//   2. At which RPS does http_req_failed first exceed 1%?                          → breaking point
//   3. Is the bottleneck CPU (check ECS CloudWatch) or DB (check RDS CloudWatch)?
//   4. How long after ramp-down does error rate return to 0%?                      → recovery time
//
// These numbers feed back into:
//   - Calibrating the scale-out threshold (5000 req/min = ~83 RPS at 1 task)
//   - Setting the spike test target (3× breaking point)
//   - Deciding whether 0.25 vCPU per task is sufficient for real API load
//
// Dashboard:
//   Summary tab → compare http_req_waiting per phase group.
//   If Phase 3 (Availability) waiting time is the first to cross 1500ms, the DB
//   availability scan is the bottleneck — not the app CPU.
//   If all phases degrade together, the bottleneck is CPU or connection pool.
//
// Note: No hard pass/fail threshold — goal is observation, not pass/fail.

import http from 'k6/http';
import { check, group } from 'k6';
import { B2C_BASE_URL, B2C } from '../utils/config.js';

// PEAK_RATE: peak stage target in iter/min. Default 1800 (~30 iter/sec).
// Converted to iter/sec. Must be > 20 iter/sec (the stage before peak) — enforced via Math.max.
// Override at run time: k6 run --env PEAK_RATE=3600 stress-test.js
const peakRateMin = parseInt(__ENV.PEAK_RATE, 10) || 1800;
const peakRateSec = Math.max(21, Math.round(peakRateMin / 60));

export const options = {
  scenarios: {
    b2c_stress: {
      executor:          'ramping-arrival-rate',
      startRate:         1,
      timeUnit:          '1s',
      preAllocatedVUs:   50,
      maxVUs:            Math.max(300, peakRateSec * 10),
      stages: [
        { target: 2,           duration: '2m' },   // warm up (~12 req/min)
        { target: 5,           duration: '3m' },   // low load (~30 req/min)
        { target: 10,          duration: '3m' },   // moderate load (~60 req/min)
        { target: 20,          duration: '3m' },   // high load (~120 req/min)
        { target: peakRateSec, duration: '3m' },   // peak push
        { target: 0,           duration: '3m' },   // recovery
      ],
    },
  },
  // Soft ceiling only — goal is to find where things break, not to enforce a pass.
  thresholds: {
    http_req_duration: ['p(95)<10000'],
    http_req_blocked:  ['p(95)<500'],
  },
};

const HEADERS = { headers: { Accept: 'application/json' } };

export function setup() {
  http.get(`${B2C_BASE_URL}/api/v1/destinations/cities`, HEADERS);
  http.get(`${B2C_BASE_URL}/api/v1/destinations/beaches`, HEADERS);
  http.get(`${B2C_BASE_URL}/api/v1/destinations/regions`, HEADERS);
  http.get(`${B2C_BASE_URL}/api/v1/features/sections`, HEADERS);
}

export default function () {
  group('Phase 2 - Location & Vendor', function () {
    const vendor = http.get(
      `${B2C_BASE_URL}/api/v1/features/public/vendor?publicReference=${B2C.publicReference}`,
      HEADERS
    );
    check(vendor, { 'vendor: status 200': (r) => r.status === 200 });
  });

  // Phase 3 is the primary measurement target — watch its http_req_waiting closely.
  group('Phase 3 - Availability', function () {
    const avail = http.get(
      `${B2C_BASE_URL}/api/v1/features/public/sections/${B2C.sectionId}/beach_chairs_availability` +
      `?start=${B2C.startDate}&end=${B2C.endDate}` +
      `&publicReference=${B2C.publicReference}&timeZone=${encodeURIComponent(B2C.timeZone)}`,
      HEADERS
    );
    check(avail, {
      'availability: status 200':       (r) => r.status === 200,
      'availability: under 2000ms SLA': (r) => r.timings.duration < 2000,
    });
  });

  group('Phase 4 - Chair & Pricing', function () {
    const chair = http.get(
      `${B2C_BASE_URL}/api/v1/bookings/beach-chairs/${B2C.beachChairId}`,
      HEADERS
    );
    check(chair, { 'chair: status 200': (r) => r.status === 200 });

    http.get(
      `${B2C_BASE_URL}/api/v1/prices/calculate` +
      `?start=${B2C.startDate}&end=${B2C.endDate}` +
      `&model=${B2C.chairModel}&publicReference=${B2C.publicReference}` +
      `&rowId=${B2C.rowId}&sectionId=${B2C.sectionId}`,
      HEADERS
    );

    http.get(
      `${B2C_BASE_URL}/api/v1/prices/rates` +
      `?start=${B2C.singleDate}&end=${B2C.singleDate}` +
      `&publicReference=${B2C.publicReference}` +
      `&model=${B2C.chairModelSingle}&rowId=${B2C.rowId}&sectionId=${B2C.sectionId}`,
      HEADERS
    );
  });
}
