// load-tests/k6/stress-test.js
// Stress test: gradually ramp RPS to find the system's breaking point.
//
// What this simulates:
//   Organic traffic growth — load increases steadily until something breaks.
//   After the peak, traffic drops and we observe how fast the system recovers.
//
// Stage breakdown:
//   0:00 ->  2:00   1  -> 10 RPS   (warm up)
//   2:00 ->  4:00   10 -> 30 RPS   (moderate load)
//   4:00 ->  6:00   30 -> 60 RPS   (high load)
//   6:00 ->  8:00   60 -> 100 RPS  (near-limit push)
//   8:00 -> 11:00  100 ->  0 RPS   (recovery — Phase D)
//
// Key questions to answer after the run:
//   1. At which RPS did http_req_failed first exceed 1%?   -> breaking point
//   2. At which RPS did p95 first exceed 500ms?            -> degradation point
//   3. How long after ramp-down did error rate return to 0%? -> recovery time
//   4. Did ECS RunningTaskCount increase? How fast?

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
        { target: 10,  duration: '2m' },  // warm up
        { target: 30,  duration: '2m' },  // moderate load
        { target: 60,  duration: '2m' },  // high load
        { target: 100, duration: '2m' },  // near-limit push
        { target: 0,   duration: '3m' },  // recovery
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
