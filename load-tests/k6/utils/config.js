// load-tests/k6/utils/config.js
// Single source of truth for target URLs, API constants, and pass/fail thresholds.
// Override any value via env var: k6 run -e BASE_URL=http://... script.js

// --- ECS health-check tests (smoke, stress, load, spike on /health) ---
export const BASE_URL = __ENV.BASE_URL || 'http://strandbutler-test-alb-838959981.eu-west-2.elb.amazonaws.com';
// export const BASE_URL = __ENV.BASE_URL || 'https://api.skj-test.click';

// --- B2C real API tests ---
export const B2C_BASE_URL = __ENV.B2C_BASE_URL || 'http://strandbutler-test-alb-838959981.eu-west-2.elb.amazonaws.com';
// export const B2C_BASE_URL = __ENV.B2C_BASE_URL || 'https://api.skj-test.click';

// Fixture values from the Postman environment (test environment)
export const B2C = {
  publicReference: '9317a032-bf53-4bcf-8df0-9a668ddcee6a',
  sectionId:       '338',
  beachChairId:    '6145',
  vendorId:        '140',
  rowId:           '453',
  timeZone:        'Europe/Berlin',
  startDate:       '2025-12-22',
  endDate:         '2025-12-25',
  singleDate:      '2025-12-22',
  chairModel:      'XXL_BEACH_CHAIR',
  chairModelSingle: 'XL_BEACH_CHAIR',
  source:          'CUSTOMER_APP',
};

// Thresholds for /health endpoint (CPU-light, no DB)
export const DEFAULT_THRESHOLDS = {
  http_req_duration: ['p(95)<500'],
  http_req_failed:   ['rate<0.01'],
};

// Thresholds for real API endpoints (DB queries, no cache)
//
// Based on k6 dashboard decision tables:
//   http_req_duration  p95 < 2000ms  — availability SLA is 2000ms, used as ceiling
//   http_req_duration  p99 < 5000ms  — worst-case outliers (GC pause, slow query)
//   http_req_waiting   p95 < 1500ms  — TTFB: isolates server/DB processing time from network
//   http_req_blocked   p95 < 10ms    — connection pool health: > 10ms indicates pool saturation
//   http_req_failed    rate < 1%     — reliability threshold
export const B2C_THRESHOLDS = {
  http_req_duration: ['p(95)<2000', 'p(99)<5000'],
  http_req_waiting:  ['p(95)<1500'],
  http_req_blocked:  ['p(95)<10'],
  http_req_failed:   ['rate<0.01'],
};