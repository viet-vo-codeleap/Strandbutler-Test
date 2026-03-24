// load-tests/k6/b2c/case4-sustained-load.js
// Case 4: Long Lasting Spike
//
// Real-world model:
//   All 10,000 users arrive within 10 minutes → 1,000 users/min
//   Each makes ~6 read requests per session
//   Total request rate: ~1000 iter/min = ~16 iter/sec = ~100 RPS sustained
//
// What this validates:
//   Unlike Case 3 (brief burst), this load is sustained long enough for ECS
//   auto-scaling to react. The test validates the full scale-out cycle:
//     1. Load crosses scale-out threshold (5000 req/min per task at ~83 RPS)
//     2. CloudWatch alarm fires at T+120s
//     3. ECS provisions 4 new tasks simultaneously
//     4. Tasks become healthy and registered at T+300s (~5 min measured)
//     5. CPU drops to ~30% per task — load distributed across 5 tasks
//
//   The key question is whether ECS can scale fast enough to prevent sustained
//   errors. Errors are expected during the 5-minute provisioning window.
//   After T+300s, the system should stabilise and errors should drop to 0.
//
// Dashboard:
//   Overview → watch http_req_failed: should spike then recover at ~T+300s.
//   Watch http_req_duration: should drop when new tasks become healthy.
//   CloudWatch → correlate RunningTaskCount change with k6 recovery timestamp.
//
// Pass criteria (soft):
//   Error rate returns to < 1% within 8 minutes of load start.
//   p95 < 2000ms after T+300s (once all tasks are healthy).

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { B2C_BASE_URL, B2C } from '../utils/config.js';

export const options = {
  scenarios: {
    case4_sustained_load: {
      executor:          'ramping-arrival-rate',
      startRate:         2,
      timeUnit:          '1s',
      preAllocatedVUs:   100,
      maxVUs:            500,
      stages: [
        { target: 16, duration: '2m' },   // ramp to ~1000 iter/min (~100 RPS)
        { target: 16, duration: '10m' },  // hold — long enough for ECS to scale out and stabilise
        { target: 0,  duration: '3m' },   // ramp down — observe ALB drain
      ],
    },
  },
  // Soft thresholds — errors during the 5-min provisioning window are expected.
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_blocked:  ['p(95)<100'],
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

    sleep(0.3 + Math.random() * 0.3);
  });

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

    sleep(0.5 + Math.random() * 1);
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

    sleep(0.3 + Math.random() * 0.5);
  });
}
