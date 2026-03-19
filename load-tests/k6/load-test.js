// load-tests/k6/load-test.js
// Load test: ramp to 500 RPS, hold for 8 minutes, then ramp down.
//
// What this simulates:
//   A realistic peak event (e.g., flash sale opening) where traffic builds quickly
//   to ~500 RPS and sustains long enough for ECS auto-scaling to complete a full
//   scale-out cycle and stabilise.
//
// Stage breakdown:
//   0:00 →  2:00   0  → 500 RPS   ramp up
//   2:00 → 10:00  500 RPS          hold — let ECS scale out and stabilise
//   10:00 → 14:00  500 → 0 RPS    ramp down — observe scale-in and ALB drain
//   Total: 14 minutes
//
// Why 14 minutes?
//   ECS auto-scaling needs 3-5 minutes from when CPU crosses the threshold to when
//   a new task is healthy and serving traffic (2-min CloudWatch alarm + 60-120s task
//   warmup). A 5-minute test often ends before the new task finishes warming up —
//   you'd see RunningTaskCount tick up in CloudWatch but never see the latency effect.
//   The 8-minute hold gives ECS enough time to scale out AND for the effect to show
//   up in k6's http_req_duration metrics.
//
// Calibration note:
//   500 RPS may not trigger auto-scaling depending on your Fargate task CPU size.
//   Before running this test, check CloudWatch CPUUtilization at 100-200 RPS to
//   confirm the target RPS will push CPU above 60%. If it doesn't, increase the
//   plateau target above.
//
// Pass criteria:
//   p95 < 500ms, error rate < 1%

import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, DEFAULT_THRESHOLDS } from './utils/config.js';

export const options = {
  scenarios: {
    load_test: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 1000,
      stages: [
        { target: 500, duration: '20s' },   // ramp up to peak load
        { target: 500, duration: '80s' },   // hold — let ECS scale out and stabilise
        { target: 0,   duration: '40s' },   // ramp down — observe scale-in and ALB drain
      ],
    },
  },
  thresholds: DEFAULT_THRESHOLDS,
};

export default function () {
  const res = http.get(`${BASE_URL}/health`);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
