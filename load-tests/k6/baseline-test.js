// load-tests/k6/baseline-test.js
// Baseline test: simulate a normal average day of traffic.
//
// Based on business traffic model:
//   10,000 users spread evenly across 6 hours → ~27.8 users/min
//   Simulated over 10 minutes: ~278 concurrent users
//   Each user makes 3 requests over 6 seconds → ~1.4 RPS (84 req/min)
//
// What this answers:
//   Does a single Fargate task handle a normal day with headroom?
//   What is idle-state latency and resource utilisation?
//   Is there any memory leak or degradation over a sustained low-load period?
//
// Stage breakdown:
//   0:00 →  1:00   0 → 2 RPS   ramp up (gentle)
//   1:00 → 11:00   2 RPS       hold — steady normal day load
//   11:00 → 12:00  2 → 0 RPS  ramp down
//   Total: 12 minutes
//
// Pass criteria:
//   p95 < 500ms, error rate < 1% — this load should be well within capacity.
//   Any failure here means the service is broken, not just stressed.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, DEFAULT_THRESHOLDS } from './utils/config.js';

export const options = {
  scenarios: {
    baseline_test: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 50,
      stages: [
        { target: 2,  duration: '1m' },   // ramp up
        { target: 2,  duration: '10m' },  // hold — normal day load
        { target: 0,  duration: '1m' },   // ramp down
      ],
    },
  },
  thresholds: DEFAULT_THRESHOLDS,
};

export default function () {
  const res = http.get(`${BASE_URL}/health`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'body has status ok': (r) => {
      try {
        return JSON.parse(r.body).status === 'ok';
      } catch {
        return false;
      }
    },
  });

  sleep(2); // simulate user think time between requests
}
