// load-tests/k6/spike-test.js
// Spike test: burst from 5 RPS to N RPS in 5 seconds — worst case scenario.
//
// What this simulates:
//   A sudden, extreme traffic spike with no warning — a viral post, a bot attack,
//   or a flash sale where all users hit the system simultaneously the moment it opens.
//   Unlike the stress test (gradual ramp), this gives the system no time to auto-scale
//   before the peak hits. It tests whether the system can absorb the shock or falls over.
//
// Stage breakdown:
//   0:00 →  1:00     5 RPS  (baseline warm-up)
//   1:00 →  1:05   500 RPS  (burst — 5 second spike to simulate sudden flood)
//   1:05 →  4:05   500 RPS  (sustain peak — observe whether the system stabilises)
//   4:05 →  6:05     5 RPS  (ramp down — observe recovery)
//
// Calibration note:
//   500 RPS is a placeholder. The correct spike target is 3-5x the single-task breaking
//   point found in the stress test. Once you have stress test results:
//     1. Note the breaking point RPS (first time error rate > 1%)
//     2. Set the spike target to 3x that number
//     3. Re-run this test
//   Example: stress test breaks at 40 RPS → spike target should be ~120-200 RPS, not 500.
//   Running at 500 RPS when one task breaks at 40 RPS is valid as a worst-case test, but
//   it may saturate the ALB or k6 itself rather than isolating ECS behaviour.
//
// Key questions to answer after the run:
//   1. Did the system survive the burst or did it immediately return 5xx errors?
//   2. If it recovered: how long did it take to stabilise at peak RPS?
//   3. Did ECS scale out fast enough to handle the load, or did it arrive too late?
//   4. After ramp-down, how long until error rate returned to 0?
//
// Note on ECS auto-scaling:
//   ECS typically takes 60-120 seconds to provision and warm up new Fargate tasks.
//   A 5-second spike will almost certainly overwhelm the current task count.
//   The question is not whether errors appear — they will — but how quickly
//   the system recovers once ECS catches up.

import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL } from './utils/config.js';

export const options = {
  scenarios: {
    spike_test: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 1000,
      stages: [
        { target: 5,   duration: '1m' },   // warm up at baseline
        { target: 500, duration: '5s' },   // sudden burst — 5 second spike
        { target: 500, duration: '3m' },   // sustain peak load
        { target: 5,   duration: '2m' },   // ramp down, observe recovery
      ],
    },
  },
  // No hard pass/fail — this test is expected to produce errors.
  // Goal is to measure error rate and recovery time, not to pass a threshold.
  thresholds: {
    http_req_duration: ['p(95)<5000'],  // very soft ceiling
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/health`);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
