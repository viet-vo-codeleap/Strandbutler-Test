// load-tests/k6/load-test.js
// Phase B: Load test - Constant arrival rate of 0.5 RPS for 10 minutes.
// This is a scaled-down proxy for the 10k requests / 6 hours scenario.
// 0.5 RPS x 600s = 300 requests total (proportionally equivalent to 10k / 6h).

import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, DEFAULT_THRESHOLDS } from "./utils/config.js";

export const options = {
  scenarios: {
    load_test: {
      executor: 'constant-arrival-rate',
      rate: 1, // 1 request per time unit
      timeUnit: '2s', // time unit = 2 seconds -> 0.5 RPS
      duration: '10m',
      preAllocatedVUs: 5,
      maxVUs: 20, // allow k6 to spin up more VUs if needed
    },
  },
  thresholds: DEFAULT_THRESHOLDS,
};

export default function () {
  const res = http.get(`${BASE_URL}/health`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
};
