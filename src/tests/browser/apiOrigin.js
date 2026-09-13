const { APP_ENV } = require('../../../config/env');

const API_ORIGIN = String(APP_ENV?.API_PLAYWRIGHT || '').replace(/\/$/, '');

if (!API_ORIGIN) {
  throw new Error('API_PLAYWRIGHT nao configurado.');
}

module.exports = { API_ORIGIN };
