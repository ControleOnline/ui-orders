const { APP_ENV } = require('../../../config/env');

const API_ORIGIN = String(APP_ENV?.API_PLAYWRIGHT || '').replace(/\/$/, '');
const API_ORIGINS = [...new Set([
  API_ORIGIN,
  String(APP_ENV?.API_ENTRYPOINT || '').replace(/\/$/, ''),
].filter(Boolean))];

if (!API_ORIGIN) {
  throw new Error('API_PLAYWRIGHT nao configurado.');
}

module.exports = { API_ORIGIN, API_ORIGINS };
