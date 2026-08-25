const {expect, test} = require('playwright/test');
const {createPosApiMock, bootstrapPosBrowser, bindBrowserDiagnostics} = require('./single-item-api-mock');
const {
  APP_VERSION,
  createCompany,
  createLoyaltySnapshotCard,
  createPeopleSearchResult,
} = require('./single-item-fixtures');

const clickProduct = async (page, name) => {
  const card = page
    .getByText(name, {exact: true})
    .locator("xpath=ancestor::div[contains(., '')][1]");
  await card.locator("xpath=.//*[normalize-space(.)='']").last().click();
};

const openCheckoutWithSelectedProducts = async page => {
  await page.getByText('Conferir pedido', {exact: true}).last().click();
};

test.describe('single-item browser smoke', () => {
  test('does not request a linked order code for loyalty stamp before customer CPF identification', async ({
    page,
  }) => {
    bindBrowserDiagnostics(page);
    const company = createCompany(3, {
      name: 'Restaurante Centro',
      alias: 'Centro',
      configs: {
        'pos-cash-wallet': 101,
        'pos-cielo-wallet': 102,
        'shop-loyalty-coupons-enabled': '1',
      },
    });
    const deviceConfig = {
      id: 1,
      device: {
        id: 1,
        device: 'web-7',
      },
      people: {
        id: 3,
      },
      type: 'PDV',
      configs: JSON.stringify({
        'config-version': APP_VERSION,
        'pos-operation-mode': 'single-item',
        'check-order-type': 'stamp',
        'pos-gateway': 'cielo',
        'pos-type': 'simple',
        'payment-type-ids': [1, 2],
        'cash-wallet-closed-id': 0,
        'pos-default-status': 901,
        'pos-paid-status': 902,
      }),
    };

    await createPosApiMock(page, {
      company,
      deviceConfig,
      runtimeConfigs: {
        'pos-cash-wallet': 101,
        'pos-cielo-wallet': 102,
        'shop-loyalty-coupons-enabled': '1',
        'shop-loyalty-gift-product-id': '103',
      },
    });
    await bootstrapPosBrowser(page);

    await page.goto(
      '/add-product-screen?id=123&resumeExistingOrder=true&singleItemMode=true',
    );

    await expect(page.getByText('Suco', {exact: true})).toBeVisible();
    await expect(page.getByPlaceholder('Linked Order Code')).toBeHidden();

    const replaceRequestPromise = page.waitForRequest(request =>
      request.url().includes('/orders/123/replace-products') &&
      request.method() === 'PUT',
    );

    await clickProduct(page, 'Suco');
    await openCheckoutWithSelectedProducts(page);

    const replaceRequest = await replaceRequestPromise;
    expect(replaceRequest.postDataJSON()).toEqual([{product: '102', quantity: 1}]);

    await expect(page).toHaveURL(/checkout/);
    await expect(page.getByText(/Identifique o cliente|Identificar cliente/i)).toBeVisible();
    await expect(page.getByText(/^Dinheiro$/i)).toBeHidden();
  });

  test('locks the payment step to Cartao Fidelidade when the selected CPF already completed the card', async ({
    page,
  }) => {
    bindBrowserDiagnostics(page);
    const loyaltyPerson = createPeopleSearchResult(20, {
      name: 'Cliente Fidelidade',
      cpf: '12345678901',
    });
    await createPosApiMock(page, {
      company: createCompany(3, {
        name: 'Restaurante Centro',
        alias: 'Centro',
        configs: {
          'pos-cash-wallet': 101,
          'pos-cielo-wallet': 102,
          'shop-loyalty-coupons-enabled': '1',
        },
      }),
      deviceConfig: {
        id: 1,
        device: {
          id: 1,
          device: 'web-7',
        },
        people: {
          id: 3,
        },
        type: 'PDV',
        configs: JSON.stringify({
          'config-version': APP_VERSION,
          'pos-operation-mode': 'single-item',
          'check-order-type': 'stamp',
          'pos-gateway': 'cielo',
          'pos-type': 'simple',
          'payment-type-ids': [1, 2],
          'cash-wallet-closed-id': 0,
          'pos-default-status': 901,
          'pos-paid-status': 902,
        }),
      },
      runtimeConfigs: {
        'pos-cash-wallet': 101,
        'pos-cielo-wallet': 102,
        'shop-loyalty-coupons-enabled': '1',
        'shop-loyalty-gift-product-id': '103',
      },
      peopleSearchResults: [loyaltyPerson],
      fidelitySnapshots: {
        '20': {
          member: [
            createLoyaltySnapshotCard({
              cardId: 600,
              providerAlias: 'Centro',
              requiredSales: 3,
              stampIds: [701, 702, 703],
            }),
          ],
        },
      },
    });
    await bootstrapPosBrowser(page);

    await page.goto(
      '/add-product-screen?id=123&resumeExistingOrder=true&singleItemMode=true',
    );
    await clickProduct(page, 'Suco');
    await openCheckoutWithSelectedProducts(page);

    await expect(page.getByText(/Identifique o cliente|Identificar cliente/i)).toBeVisible();
    await page.getByRole('button', {name: /Continuar/i}).click();
    await expect(page.getByPlaceholder('Digite o CPF')).toBeVisible();
    await page.getByPlaceholder('Digite o CPF').fill('12345');
    await expect(page.getByText('Cliente Fidelidade', {exact: true})).toBeVisible();

    const snapshotRequestPromise = page.waitForRequest(request =>
      request.url().includes('/orders/fidelityById/20') &&
      request.method() === 'GET',
    );

    await page.getByText('Cliente Fidelidade', {exact: true}).click();
    await snapshotRequestPromise;

    await expect(
      page.getByText(
        'Finalizar com Cartao Fidelidade',
        {exact: true},
      ),
    ).toBeVisible();

    await expect(
      page.getByText('O cartao deste CPF completou a meta. Esta venda segue apenas com Cartao Fidelidade.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText('Cartao Fidelidade', {exact: true})).toBeVisible();
    await expect(page.getByText('Dinheiro', {exact: true})).toHaveCount(0);
    await expect(page.getByText('Crédito Cielo', {exact: true})).toHaveCount(0);

    const invoiceRequestPromise = page.waitForRequest(request =>
      request.url().endsWith('/invoices') &&
      request.method() === 'POST',
    );
    const closeParentRequestPromise = page.waitForRequest(request =>
      request.url().includes('/orders/600/delivered') &&
      request.method() === 'POST',
    );
    const addProductsRequestPromise = page.waitForRequest(request =>
      request.url().includes('/orders/123/add-products') &&
      request.method() === 'PUT',
    );

    await page.getByText('Finalizar com Cartao Fidelidade', {exact: true}).click();

    const addProductsRequest = await addProductsRequestPromise;
    const invoiceRequest = await invoiceRequestPromise;
    const closeParentRequest = await closeParentRequestPromise;
    expect(addProductsRequest.postDataJSON()).toEqual([
      {
        product: '103',
        quantity: 1,
        comment: 'Brinde fidelidade',
      },
    ]);
    expect(closeParentRequest.postDataJSON()).toEqual({});
    expect(invoiceRequest.postDataJSON().price).toBe(8.9);

    await expect(page).toHaveURL(/order-history-page/);
  });
});
