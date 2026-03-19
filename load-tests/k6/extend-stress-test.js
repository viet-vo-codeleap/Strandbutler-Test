// load-tests/k6/stress-test.js
// Stress test: gradually ramp RPS to find the system's breaking point.
//
// What this simulates:
//   Organic traffic growth — load increases steadily until something breaks.
//   After the peak, traffic drops and we observe how fast the system recovers.
//
// Stage breakdown (4-minute stages to give ECS time to react within each window):
//   0:00  →  4:00    1  →  10 RPS   (warm up — well below threshold)
//   4:00  →  8:00   10  →  50 RPS   (moderate load)
//   8:00  → 12:00   50  → 100 RPS   (high load — scale-out should trigger here)
//   12:00 → 16:00  100  → 200 RPS   (new territory)
//   16:00 → 20:00  200  → 300 RPS   (find the break)
//   20:00 → 26:00  300  →   0 RPS   (recovery + ALB drain window)
//
// Why 4-minute stages?
//   ECS auto-scaling needs up to 4-5 minutes to react: 2 minutes for the CloudWatch alarm
//   evaluation period, plus 60-120 seconds for a new Fargate task to become healthy.
//   2-minute stages don't give ECS enough time to scale and absorb load at each level —
//   you'd see continuous degradation instead of observing whether scaling helped.
//
// Why 6-minute ramp-down?
//   ALB has a deregistration delay (default 300 seconds). When ECS removes a task during
//   scale-in, the ALB drains in-flight connections before terminating it. The 6-minute
//   recovery window captures this drain cycle — watch for 502s at the start of ramp-down.
//
// Key questions to answer after the run:
//   1. At which RPS did http_req_failed first exceed 1%?   -> breaking point
//   2. At which RPS did p95 first exceed 500ms?            -> degradation point
//   3. How long after ramp-down did error rate return to 0%? -> recovery time
//   4. Did ECS RunningTaskCount increase? At which stage? How many seconds after load increased?

import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL } from './utils/config.js';

export const options = {
  scenarios: {
    stress_test: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 500,
      stages: [
        { target: 10,  duration: '4m' },  // warm up
        { target: 50,  duration: '4m' },  // moderate load
        { target: 100, duration: '4m' },  // high load — scale-out should trigger
        { target: 200, duration: '4m' },  // new territory
        { target: 300, duration: '4m' },  // find the break
        { target: 0,   duration: '6m' },  // recovery + ALB drain window
      ],
    },
  },
  // No hard pass/fail — goal is to find where things break, not to pass a threshold.
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // soft ceiling — expect to exceed at high RPS
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/health`);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
