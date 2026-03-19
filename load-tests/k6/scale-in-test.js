// load-tests/k6/scale-in-test.js
// Scale-in test: force ECS to scale out, then drop load and observe scale-in behaviour.
//
// What this tests:
//   Scale-in is the riskier side of ECS auto-scaling. When ECS removes a task:
//   1. ECS marks the task for termination
//   2. ALB moves it to "draining" state — stops sending new requests, finishes in-flight ones
//   3. After the deregistration delay (default 300 seconds), the task is terminated
//
//   If the deregistration delay is too short or misconfigured, in-flight requests get
//   dropped mid-flight and show up as 502 errors in ALB logs. This test validates
//   that scale-in is clean: no dropped connections when load drops and tasks are removed.
//
// Stage breakdown:
//   0:00 →  2:00   0  → 80 RPS   ramp up — push CPU above 60% to trigger scale-out
//   2:00 → 10:00  80 RPS          hold — wait for 2+ tasks to become healthy
//   10:00 → 10:30  80 → 0 RPS    sudden drop — trigger scale-in alarm
//   10:30 → 16:00   0 RPS         idle — watch ALB deregistration (300s) and RunningTaskCount
//   Total: ~16 minutes
//
// Calibration note:
//   80 RPS is a placeholder. The correct value is the RPS that puts CPU at ~70-80%
//   on a single task — high enough to trigger scale-out, low enough not to cause errors.
//   Use the stress test breaking point as a reference: 80% of breaking point is a
//   reasonable target. Example: breaking point at 100 RPS → use 80 RPS here.
//
// Key questions to answer after the run:
//   1. Did RunningTaskCount increase? At what timestamp after load started?
//   2. After load dropped to 0, how long until RunningTaskCount returned to 1?
//      (ECS scale-in has a 300-second default cooldown — expect 5+ minutes)
//   3. Were there any 502 errors in CloudWatch ALB logs during the idle window?
//      (502s indicate in-flight requests were dropped during task removal)
//   4. Did k6 report any errors during the ramp-down phase?
//
// What to watch in CloudWatch during the idle window (10:30 onward):
//   - ECS > RunningTaskCount: should drop from 2+ back to 1
//   - ALB > HTTPCode_ELB_5XX_Count: 502s here mean deregistration delay is too short
//   - ALB > ActiveConnectionCount: should drop to near 0 before task count decreases

import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL } from './utils/config.js';

export const options = {
  scenarios: {
    scale_in_test: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 300,
      stages: [
        { target: 80, duration: '2m' },    // ramp up — force scale-out
        { target: 80, duration: '8m' },    // hold — confirm 2+ tasks healthy
        { target: 0,  duration: '30s' },   // sudden drop — trigger scale-in
        { target: 0,  duration: '5m30s' }, // idle — watch ALB drain (300s default)
      ],
    },
  },
  // Errors are not expected in this test — load is kept below breaking point.
  // Any errors during the idle window indicate a deregistration configuration problem.
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/health`);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
