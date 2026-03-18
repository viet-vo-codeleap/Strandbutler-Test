// load-tests/k6/stress-test.js
// Phase C + D: Stress test - ramp RPS from 1 to 30, then observe recovery.

// Stage breakdown:
// 0:00 -> 2:00 ramp up to 5 RPS
// 2:00 -> 4:00 ramp up to 10 RPS
// 4:00 -> 6:00 ramp up to 20 RPS
// 6:00 -> 8:00 ramp up to 30 RPS (this is likely the break point locally)
// 8:00 -> 11:00 ramp down to 0 RPS - observe recovery (Phase D)

// Key metrics to watch:
//  - At which RPS does http_req_failed first exceed 1%? -> breaking point
//  - At which RPS does p95 latency exceed 500ms? -> degradation point
//  - How long after ramp-down does error rate return to 0%? -> recovery time

import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL } from './utils/config.js';

export const options = {
  scenarios: {
    stress_test: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { target: 5, duration: '2m' },
        { target: 10, duration: '2m' },
        { target: 20, duration: '2m' },
        { target: 30, duration: '2m' },
        { target: 0, duration: '3m' },
      ],
    },
  },
  // No hard thresholds here - the point is to find the breaking point,
  // not to pass/fail. We record everything and interpret manually.
  thresholds: {
    http_req_duration: ['p(95)<2000'], // soft limit - we expect to exceed this
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/health`);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });
};