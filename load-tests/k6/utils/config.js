// load-tests/k6/utils/config.js
// Single source of truth for target URL and pass/fail thresholds.
// Change BASE_URL to point at any environment withouth touching test scripts.

export const BASE_URL = __ENV.BASE_URL || 'http://108.130.216.13:3000';

export const DEFAULT_THRESHOLDS = {
  // 95% of requests must complete within 500ms
  http_req_duration: ['p(95)<500'],
  // Less than 1% of requests may fail
  http_req_failed: ['rate<0.01'],
};