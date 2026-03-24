// load-tests/k6/b2c/case1-average-load.js
// Case 1: Average Load
//
// Real-world model:
//   10,000 users spread evenly over 6 hours → ~27.8 users/min
//   Simulated over 10 minutes: ~278 users, each making ~5 read requests per session
//   Total request rate: ~28 iter/min × 5 req/iter = ~140 req/min (~2.3 RPS)
//
// What this validates:
//   A normal weekday with no campaign running — the floor.
//   A single Fargate task must handle this at < 10% CPU with no scaling.
//   If this test fails or shows p95 > 500ms, the service has a baseline problem
//   unrelated to load. Fix it before running any other test case.
//
// Dashboard:
//   Overview → http_req_duration and http_req_failed should both be flat and low.
//   CloudWatch → RunningTaskCount must stay at 1. ALBRequestCountPerTarget should
//   be well below the 5000 req/min scale-out threshold.
//
// Pass criteria: p95 < 2000ms, p99 < 5000ms, error rate < 1%

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { B2C_BASE_URL, B2C, B2C_THRESHOLDS } from '../utils/config.js';

export const options = {
  scenarios: {
    case1_average_load: {
      executor:          'ramping-arrival-rate',
      startRate:         1,
      timeUnit:          '1m',           // 1 iteration per minute at start
      preAllocatedVUs:   10,
      maxVUs:            30,
      stages: [
        { target: 28, duration: '2m' },  // ramp to 28 iter/min (~140 req/min)
        { target: 28, duration: '6m' },  // hold — flat average day load
        { target: 0,  duration: '2m' },  // ramp down
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
