// load-test/k6/smoke-test.js
// Phase A: Smoke test - 5 virtual users for 30 seconds.
// Purpose: Confirm tool works and get baseline p95 latency.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, DEFAULT_THRESHOLDS } from './utils/config.js';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: DEFAULT_THRESHOLDS,
};

export default function () {
  const res = http.get(`${BASE_URL}/health`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'body has status ok': (r) => {
      try {
        return JSON.parse(r.body).status === 'ok';
      } catch (error) {
        return false;
      }
    },
  });

  sleep(1);
}