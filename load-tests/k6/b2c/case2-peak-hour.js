// load-tests/k6/b2c/case2-peak-hour.js
// Case 2: Peak Hour
//
// Real-world model:
//   50% of users (5,000) arrive within 1 hour → ~83.3 users/min
//   Simulated over 10 minutes: ~833 users, each making ~5 read requests per session
//   Total request rate: ~83 iter/min × 5 req/iter = ~415 req/min (~6.9 RPS)
//
// Note on RPS vs original model:
//   The original Case 2 assumed 3 req/user = 250 req/min. The real API flow has
//   ~6 read requests per user session (Phases 2–4), so total RPS is higher even
//   though the user arrival rate is identical. This is a more realistic representation.
//
// What this validates:
//   The busiest regular hour. A single Fargate task (0.25 vCPU) should handle this
//   without scaling. CPU expected < 30%. If the availability endpoint (Phase 3)
//   degrades at this load, DB query optimisation or caching is needed before migration.
//
// Dashboard:
//   Overview → watch if http_req_duration starts climbing during the hold phase.
//   Timings → compare Phase 3 (Availability) waiting time vs Phase 2 and Phase 4.
//   If Phase 3 waiting time is 5–10× higher than other phases, the DB availability
//   scan is the bottleneck.
//
// Pass criteria: p95 < 2000ms, p99 < 5000ms, error rate < 1%

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { B2C_BASE_URL, B2C, B2C_THRESHOLDS } from '../utils/config.js';

export const options = {
  scenarios: {
    case2_peak_hour: {
      executor:          'ramping-arrival-rate',
      startRate:         5,
      timeUnit:          '1m',            // start at 5 iter/min
      preAllocatedVUs:   30,
      maxVUs:            100,
      stages: [
        { target: 83, duration: '2m' },   // ramp to 83 iter/min (~415 req/min)
        { target: 83, duration: '6m' },   // hold — peak hour load
        { target: 0,  duration: '2m' },   // ramp down
      ],
    },
  },
  thresholds: B2C_THRESHOLDS,
};

const HEADERS = { headers: { Accept: 'application/json' } };

// Phase 1 — Discovery: called once, not per VU iteration (no cache in test env).
export function setup() {
  http.get(`${B2C_BASE_URL}/api/v1/destinations/cities`, HEADERS);
  http.get(`${B2C_BASE_URL}/api/v1/destinations/beaches`, HEADERS);
  http.get(`${B2C_BASE_URL}/api/v1/destinations/regions`, HEADERS);
  http.get(`${B2C_BASE_URL}/api/v1/features/sections`, HEADERS);
}

export default function () {
  // Phase 2 — Location & Vendor Selection
  group('Phase 2 - Location & Vendor', function () {
    const vendor = http.get(
      `${B2C_BASE_URL}/api/v1/features/public/vendor?publicReference=${B2C.publicReference}`,
      HEADERS
    );
    check(vendor, { 'vendor: status 200': (r) => r.status === 200 });

    sleep(0.5 + Math.random() * 0.5);
  });

  // Phase 3 — Availability Check (performance-critical, 2000ms SLA)
  // No cache — every request hits the DB. Watch http_req_waiting in Timings tab.
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

    sleep(1 + Math.random() * 2);
  });

  // Phase 4 — Chair & Pricing
  group('Phase 4 - Chair & Pricing', function () {
    const chair = http.get(
      `${B2C_BASE_URL}/api/v1/bookings/beach-chairs/${B2C.beachChairId}`,
      HEADERS
    );
    check(chair, { 'chair: status 200': (r) => r.status === 200 });

    const multiPrice = http.get(
      `${B2C_BASE_URL}/api/v1/prices/calculate` +
      `?start=${B2C.startDate}&end=${B2C.endDate}` +
      `&model=${B2C.chairModel}&publicReference=${B2C.publicReference}` +
      `&rowId=${B2C.rowId}&sectionId=${B2C.sectionId}`,
      HEADERS
    );
    check(multiPrice, { 'multi-day pricing: status 200': (r) => r.status === 200 });

    const singleRate = http.get(
      `${B2C_BASE_URL}/api/v1/prices/rates` +
      `?start=${B2C.singleDate}&end=${B2C.singleDate}` +
      `&publicReference=${B2C.publicReference}` +
      `&model=${B2C.chairModelSingle}&rowId=${B2C.rowId}&sectionId=${B2C.sectionId}`,
      HEADERS
    );
    check(singleRate, { 'single-day rates: status 200': (r) => r.status === 200 });

    sleep(0.5 + Math.random() * 1);
  });
}
