const {expect, test} = require('playwright/test');
const {createPosApiMock, bootstrapPosBrowser, bindBrowserDiagnostics} = require('./single-item-api-mock');
const fs = require('fs');
const path = require('path');
const {
  LAVEGO_THEME_COLORS,
  SINGLE_ITEM_SCREENSHOT_DIR,
  createCompany,
  createOpenOrder,
  createProduct,
  createRegisteredMedia,
} = require('./single-item-fixtures');

test.describe('single-item official responsive layout', () => {
  const viewports = [
    {name: 'maquininha', width: 320, height: 568},
    {name: 'celular', width: 390, height: 844},
    {name: 'desktop', width: 1440, height: 900},
  ];

  for (const mediaMode of ['with-media', 'compact']) {
    for (const viewport of viewports) {
      test(`${mediaMode} on ${viewport.name}`, async ({page}) => {
        bindBrowserDiagnostics(page);
        await page.setViewportSize({width: viewport.width, height: viewport.height});
        await page.route('https://media.test/**', route =>
          route.fulfill({
            status: 200,
            headers: {'content-type': 'image/svg+xml'},
            body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 150"><rect width="240" height="150" fill="#111827"/><circle cx="205" cy="25" r="46" fill="#FEBC1D" opacity=".22"/><path fill="#FEBC1D" d="M37 91h18l18-34h82l31 34h18v28H37zm49-23-12 23h86l-21-23z"/><circle cx="78" cy="118" r="15" fill="#000"/><circle cx="169" cy="118" r="15" fill="#000"/><path d="M15 130c59-24 133-20 225 1v19H15z" fill="#F3F7FB"/></svg>',
          }),
        );

        const visualProducts = [
          createProduct(46, {product: 'Caminhonetas', type: 'service', price: 55}),
          createProduct(45, {product: 'Pick-ups e SUVs', type: 'service', price: 45}),
          createProduct(47, {product: 'Sujeira pesada', type: 'service', price: 65}),
          createProduct(44, {product: 'Veículos de passeio', type: 'service', price: 35}),
        ].map(product => ({
          ...product,
          productFiles:
            mediaMode === 'with-media'
              ? [createRegisteredMedia(product.id)]
              : [],
        }));
        const company = createCompany(3, {
          name: 'LaveGo',
          alias: 'LaveGo',
          theme: {colors: LAVEGO_THEME_COLORS},
          configs: {
            'pos-cash-wallet': 101,
            'pos-cielo-wallet': 102,
          },
        });

        await createPosApiMock(page, {
          company,
          defaultCompany: company,
          order: createOpenOrder({products: [visualProducts[1]], price: 45}),
          products: visualProducts,
        });
        await bootstrapPosBrowser(page);
        await page.goto('/pdv-page');

        await expect(page.getByText('Serviços', {exact: true})).toBeVisible();
        await expect(page.getByText('4 disponíveis', {exact: true})).toBeVisible();
        await expect(page.getByRole('radio', {name: 'Caminhonetas'})).toBeVisible();
        await expect(page.getByRole('radio', {name: 'Veículos de passeio'})).toBeVisible();
        await expect(page.getByTestId('bottom-navigation')).toBeVisible();

        fs.mkdirSync(SINGLE_ITEM_SCREENSHOT_DIR, {recursive: true});
        await page.screenshot({
          path: path.join(
            SINGLE_ITEM_SCREENSHOT_DIR,
            `${mediaMode}-${viewport.name}.png`,
          ),
          fullPage: false,
        });
      });
    }
  }
});
