// BD-067 load scenario (k6). Synthetic data only; run against a local/throwaway app + database.
//   docker run --rm -i -e BASE_URL=http://host.docker.internal:3100 -e VUS=10 -e DURATION=2m grafana/k6 run - < perf/load.js
// Expects the app to use workshop A from perf/seed.sql as its tenant (MOCK_TENANT_ID=00000000-0000-4000-8000-0000000000a1).
import http from 'k6/http';
import { check, sleep } from 'k6';
import { md5 } from 'k6/crypto';

const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:3100';
const VEHICLES_IN_SEED = 6000;
const SEARCH_TERMS = ['Nkosi', 'botha', 'Lerato', 'van', '0820001', 'cust-a12'];

// Same id formula as perf/seed.sql: md5(label) formatted as a uuid.
function seedUuid(label) {
  const h = md5(label, 'hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// [weight, tag, path builder]: roughly what station staff do during a day.
const REQUESTS = [
  [35, 'job_card_board', () => '/api/job-cards'],
  [20, 'customer_search', () => `/api/customers?q=${encodeURIComponent(pick(SEARCH_TERMS))}`],
  [10, 'customer_list_all', () => '/api/customers'],
  [10, 'staff_workload', () => '/api/job-cards/staff'],
  [15, 'vehicle_history', () => `/api/vehicles/${seedUuid('A-veh-' + (1 + Math.floor(Math.random() * VEHICLES_IN_SEED)))}/history`],
  [10, 'station_dashboard', () => '/en/station'],
];
const TOTAL_WEIGHT = REQUESTS.reduce((sum, [w]) => sum + w, 0);

const BUDGET_P95_MS = Number(__ENV.BUDGET_P95_MS || 500);

export const options = {
  vus: Number(__ENV.VUS || 10),
  duration: __ENV.DURATION || '2m',
  summaryTrendStats: ['avg', 'p(50)', 'p(95)', 'max'],
  thresholds: Object.fromEntries([
    ['http_req_failed', ['rate<0.01']],
    ...REQUESTS.map(([, tag]) => [`http_req_duration{endpoint:${tag}}`, [`p(95)<${BUDGET_P95_MS}`]]),
  ]),
};

export default function () {
  let roll = Math.random() * TOTAL_WEIGHT;
  const [, tag, path] = REQUESTS.find(([w]) => (roll -= w) < 0) || REQUESTS[0];
  const res = http.get(`${BASE_URL}${path()}`, { tags: { endpoint: tag } });
  check(res, { [`${tag} 200`]: (r) => r.status === 200 });
  sleep(Math.random() * 0.5);
}
