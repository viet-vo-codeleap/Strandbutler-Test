// load-tests/k6/b2c/smoke-test.js
// B2C Smoke Test — sanity check all read endpoints before any load test run.
//
// What this does:
//   Calls every read endpoint in the booking flow exactly once with a single VU.
//   No load, no concurrency. Confirms all endpoints return 200 and respond within SLA.
//
// Run this after every deployment or environment change.
// If any check fails here, stop — do not proceed to load tests.
//
// Dashboard: watch Timings tab → Request Waiting per group to spot slow endpoints.
// Pass criteria: all checks pass, p95 < 2000ms, error rate = 0%

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { B2C_BASE_URL, B2C, B2C_THRESHOLDS } from '../utils/config.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: B2C_THRESHOLDS,
};

const HEADERS = { headers: { Accept: 'application/json' } };

export default function () {
  // Phase 1 — Discovery (heavy, no cache — direct DB hits)
  // In real user traffic these are cached on the client after first load.
  // Called once here to confirm endpoints are alive.
  group('Phase 1 - Discovery', function () {
    const cities = http.get(`${B2C_BASE_URL}/api/v1/destinations/cities`, HEADERS);
    check(cities, {
      'cities: status 200':              (r) => r.status === 200,
      'cities: has items array':         (r) => JSON.parse(r.body).items !== undefined,
      'cities: under 3000ms':            (r) => r.timings.duration < 3000,
    });

    const beaches = http.get(`${B2C_BASE_URL}/api/v1/destinations/beaches`, HEADERS);
    check(beaches, {
      'beaches: status 200':             (r) => r.status === 200,
      'beaches: under 3000ms':           (r) => r.timings.duration < 3000,
    });

    const regions = http.get(`${B2C_BASE_URL}/api/v1/destinations/regions`, HEADERS);
    check(regions, {
      'regions: status 200':             (r) => r.status === 200,
      'regions: under 3000ms':           (r) => r.timings.duration < 3000,
    });

    const sections = http.get(`${B2C_BASE_URL}/api/v1/features/sections`, HEADERS);
    check(sections, {
      'sections: status 200':            (r) => r.status === 200,
      'sections: under 3000ms':          (r) => r.timings.duration < 3000,
    });
  });

  sleep(0.5);

  // Phase 2 — Location & Vendor Selection
  group('Phase 2 - Location & Vendor', function () {
    const vendor = http.get(
      `${B2C_BASE_URL}/api/v1/features/public/vendor?publicReference=${B2C.publicReference}`,
      HEADERS
    );
    check(vendor, {
      'vendor: status 200':              (r) => r.status === 200,
    });
  });

  sleep(0.5);

  // Phase 3 — Availability Check (performance-critical, 2000ms SLA)
  // No cache — every request hits the DB directly.
  // This is the most likely bottleneck under concurrent load.
  group('Phase 3 - Availability', function () {
    const avail = http.get(
      `${B2C_BASE_URL}/api/v1/features/public/sections/${B2C.sectionId}/beach_chairs_availability` +
      `?start=${B2C.startDate}&end=${B2C.endDate}` +
      `&publicReference=${B2C.publicReference}&timeZone=${encodeURIComponent(B2C.timeZone)}`,
      HEADERS
    );
    check(avail, {
      'availability: status 200':        (r) => r.status === 200,
      'availability: under 2000ms SLA':  (r) => r.timings.duration < 2000,
      // http_req_waiting > 1500ms here indicates DB scan is slow — check RDS CloudWatch
      'availability: TTFB under 1500ms': (r) => r.timings.waiting < 1500,
    });
  });

  sleep(0.5);

  // Phase 4 — Chair & Pricing
  group('Phase 4 - Chair & Pricing', function () {
    const chair = http.get(
      `${B2C_BASE_URL}/api/v1/bookings/beach-chairs/${B2C.beachChairId}`,
      HEADERS
    );
    check(chair, {
      'chair: status 200':               (r) => r.status === 200,
    });

    const multiPrice = http.get(
      `${B2C_BASE_URL}/api/v1/prices/calculate` +
      `?start=${B2C.startDate}&end=${B2C.endDate}` +
      `&model=${B2C.chairModel}&publicReference=${B2C.publicReference}` +
      `&rowId=${B2C.rowId}&sectionId=${B2C.sectionId}`,
      HEADERS
    );
    check(multiPrice, {
      'multi-day pricing: status 200':   (r) => r.status === 200,
    });

    const singleRate = http.get(
      `${B2C_BASE_URL}/api/v1/prices/rates` +
      `?start=${B2C.singleDate}&end=${B2C.singleDate}` +
      `&publicReference=${B2C.publicReference}` +
      `&model=${B2C.chairModelSingle}&rowId=${B2C.rowId}&sectionId=${B2C.sectionId}`,
      HEADERS
    );
    check(singleRate, {
      'single-day rates: status 200':    (r) => r.status === 200,
    });
  });
}
