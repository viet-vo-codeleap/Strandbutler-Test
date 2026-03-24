// load-tests/k6/b2c/case3-spike.js
// Case 3: Spike
//
// Real-world model:
//   1,000 users hit the site within the same minute
//   Each makes ~6 read requests → ~6,000 requests in ~1 minute
//   Total request rate at burst peak: ~1000 iter/min = ~16 iter/sec = ~100 RPS
//
// What this validates:
//   An abrupt traffic surge — viral post, bot wave, or flash sale opening.
//   The system has no time to warm up or auto-scale before the peak hits.
//   ECS takes ~5 minutes to provision new tasks; the burst window is seconds.
//   Errors during the burst are expected. The question is:
//     1. How many seconds until error rate drops below 1%?
//     2. Did ECS scale out? At what timestamp?
//     3. Is the system fully recovered within 5–10 minutes?
//
// Dashboard:
//   Overview → watch the sharp spike in http_req_failed and http_req_duration
//   at T+60s (burst). Then watch how long before both metrics recover.
//   Timings → http_req_blocked will spike if connection pool is exhausted during burst.
//   If http_req_blocked p95 > 10ms during burst, pool saturation is the failure mode.
//
// Pass criteria (soft — errors during burst are expected):
//   p95 < 5000ms overall, system recovers within 10 minutes of burst

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { B2C_BASE_URL, B2C } from '../utils/config.js';

export const options = {
  scenarios: {
    case3_spike: {
      executor:          'ramping-arrival-rate',
      startRate:         5,
      timeUnit:          '1s',
      preAllocatedVUs:   100,
      maxVUs:            500,
      stages: [
        { target: 5,  duration: '1m' },   // warm up at baseline (~30 req/min)
        { target: 16, duration: '5s' },   // burst to ~1000 iter/min in 5 seconds
        { target: 16, duration: '3m' },   // sustain burst — observe ECS reaction
        { target: 2,  duration: '2m' },   // ramp down — observe recovery
      ],
    },
  },
  // No hard pass/fail thresholds — errors during the burst are expected.
  // Goal is to measure error rate and recovery time, not to pass a threshold.
  // Watch the k6 dashboard to record:
  //   - First timestamp when http_req_failed > 1%
  //   - First timestamp when http_req_failed returns to < 1%
  //   - CloudWatch RunningTaskCount change timestamp
  thresholds: {
    http_req_duration: ['p(95)<5000'],   // soft ceiling
    http_req_blocked:  ['p(95)<100'],    // connection pool health during burst
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
  });

  // Phase 3 — Availability is the primary bottleneck under spike load.
  // No think time between phases during spike — users arrive all at once.
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
  });
}
