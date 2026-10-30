// fluxo: outros | etapa: order-history-page-filtro | https://github.com/ControleOnline/app-community/wiki/Smoke-Test-Flows
const fs = require('fs');
const path = require('path');
const { expect, test } = require('playwright/test');
const packageJson = require('../../../../../../../package.json');
const { API_ORIGIN } = require('../../../../../../../src/tests/browser/apiOrigin');

const artifactsDir = path.join(__dirname, 'screenshots', 'order-history-filter');
const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const collection = (member = []) => ({ member, 'hydra:member': member, totalItems: member.length, 'hydra:totalItems': member.length });

const installSession = async page => page.addInitScript(({ version }) => {
  localStorage.setItem('session', JSON.stringify({ id: 7, people: '/people/7', api_key: 'smoke', token: 'smoke', active: 1, mycompany: 3, roles: ['ROLE_ADMIN'] }));
  localStorage.setItem('config', JSON.stringify({ language: 'pt-br' }));
  localStorage.setItem('app-type', 'MANAGER');
  localStorage.setItem('device', JSON.stringify({ id: 'smoke-web', device: 'smoke-web', type: 'WEB', appVersion: version, buildNumber: version }));
}, { version: packageJson.version });

const mockApi = async page => page.route(`${API_ORIGIN}/**`, async route => {
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers, body: '' });
  return route.fulfill({ status: 200, headers: { ...headers, 'content-type': 'application/ld+json' }, body: JSON.stringify(collection([])) });
});

const capture = async (page, name) => {
  fs.mkdirSync(artifactsDir, { recursive: true });
  await page.screenshot({ path: path.join(artifactsDir, `${name}.png`), fullPage: true });
};

test('fluxo: outros — order-history-page filtro abre modal no modo LISTA (#811)', async ({ page }) => {
  await mockApi(page);
  await installSession(page);
  await page.goto('/order-history-page');
  const filterButton = page.getByTestId('default-table-filter-button');
  await expect(filterButton).toBeVisible({ timeout: 15000 });
  await capture(page, '01-lista-antes-filtro');
  await filterButton.click();
  await expect(page.getByText(/filtros/i).first()).toBeVisible({ timeout: 10000 });
  await capture(page, '02-modal-filtros-aberto');
  await page.getByText(/aplicar/i).first().click();
  await expect(page.getByTestId('default-table-filter-button')).toBeVisible();
  await capture(page, '03-retorno-apos-aplicar');
});
