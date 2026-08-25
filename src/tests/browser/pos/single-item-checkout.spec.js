const {expect, test} = require('playwright/test');
const {createPosApiMock, bootstrapPosBrowser, bindBrowserDiagnostics} = require('./single-item-api-mock');
const {
  buildRemotePaymentResultMessage,
  createOpenOrder,
  createProduct,
} = require('./single-item-fixtures');

const productCard = (page, name) =>
  page
    .getByText(name, {exact: true})
    .locator("xpath=ancestor::div[contains(., '')][1]");

const clickProduct = async (page, name) => {
  const card = productCard(page, name);
  await card.locator("xpath=.//*[normalize-space(.)='']").last().click();
};

const openCheckoutWithSelectedProducts = async page => {
  await page.getByText('Conferir pedido', {exact: true}).last().click();
};

test.describe('single-item checkout and history browser smoke', () => {
  test('shows the runtime footer on the POS shell', async ({ page }) => {
    bindBrowserDiagnostics(page);
    await createPosApiMock(page);
    const menusPeopleRequests = [];
    page.on('request', request => {
      if (
        request.method().toUpperCase() === 'GET' &&
        request.url().includes('/menus-people')
      ) {
        menusPeopleRequests.push(request);
      }
    });

    await bootstrapPosBrowser(page);
    await expect.poll(() => menusPeopleRequests.length).toBeGreaterThan(0);
    await expect(page.getByText(/Operacao|Operação/).first()).toBeVisible();
    await expect(page.getByText(/Pedidos|Orders/).first()).toBeVisible();
    await expect(page.getByText(/Caixa|Cash/i).first()).toBeVisible();

    const runtimeFooter = page.getByTestId('runtime-info-footer');
    await expect(runtimeFooter).toBeVisible();
    const runtimeFooterPaddingBottom = await runtimeFooter.evaluate(node =>
      Number.parseFloat(window.getComputedStyle(node).paddingBottom || '0'),
    );
    const runtimeFooterPaddingLeft = await runtimeFooter.evaluate(node =>
      Number.parseFloat(window.getComputedStyle(node).paddingLeft || '0'),
    );
    expect(runtimeFooterPaddingBottom).toBeGreaterThanOrEqual(16);
    expect(runtimeFooterPaddingLeft).toBeGreaterThanOrEqual(16);
  });

  test('opens checkout after selecting the single-item product', async ({ page }) => {
    bindBrowserDiagnostics(page);
    const state = await createPosApiMock(page);

    await bootstrapPosBrowser(page);

    await page.goto(
      '/add-product-screen?id=123&resumeExistingOrder=true&singleItemMode=true',
    );

    await expect(page).toHaveURL(/products-page|add-product-screen/);
    await expect(page.getByText('Coxinha', { exact: true })).toBeVisible();
    await expect(page.getByText('Suco', { exact: true })).toBeVisible();
    await expect(productCard(page, 'Coxinha').first()).toBeVisible();

    const replaceRequestPromise = page.waitForRequest(request =>
      request.url().includes('/orders/123/replace-products') &&
      request.method() === 'PUT',
    );

    await clickProduct(page, 'Coxinha');
    await openCheckoutWithSelectedProducts(page);

    const replaceRequest = await replaceRequestPromise;
    expect(replaceRequest.postDataJSON()).toEqual([{ product: '101', quantity: 1 }]);

    await expect(page).toHaveURL(/checkout/);
    await expect(page.getByText(/^Dinheiro$/i)).toBeVisible();
    await expect(page.getByText(/^Crédito Cielo$/i).first()).toBeVisible();
    expect(state.lastReplaceProductsPayload).toEqual([{ product: '101', quantity: 1 }]);
  });

  test('does not create a draft before the operator starts an order', async ({
    page,
  }) => {
    bindBrowserDiagnostics(page);
    const state = await createPosApiMock(page);

    await bootstrapPosBrowser(page);
    await page.goto('/add-product-screen?singleItemMode=true');

    await expect(page.getByText('Coxinha', {exact: true})).toBeVisible();
    await page.waitForTimeout(150);
    expect(state.orderCreatePayloads).toHaveLength(0);
  });

  test('creates exactly one draft from the explicit new-order intent', async ({
    page,
  }) => {
    bindBrowserDiagnostics(page);
    const state = await createPosApiMock(page);

    await bootstrapPosBrowser(page);
    await page.goto('/order-history-page');
    await page.getByRole('button', {name: /^add$/i}).last().click();

    await expect(page.getByText('Coxinha', {exact: true})).toBeVisible();
    await expect.poll(() => state.orderCreatePayloads.length).toBe(1);
    await page.waitForTimeout(150);
    expect(state.orderCreatePayloads).toHaveLength(1);
  });

  test('cancels a pending new-order creation after leaving the catalog', async ({
    page,
  }) => {
    bindBrowserDiagnostics(page);
    const state = await createPosApiMock(page, {orderStatusDelayMs: 1500});

    await bootstrapPosBrowser(page);
    await page.goto('/order-history-page');
    const statusRequest = page.waitForRequest(request => {
      const url = new URL(request.url());
      return (
        request.method() === 'GET' &&
        url.pathname.endsWith('/statuses') &&
        url.searchParams.get('context') === 'order'
      );
    });
    await page.getByRole('button', {name: /^add$/i}).last().click();
    await statusRequest;
    await page.goBack({waitUntil: 'commit'});
    await expect(page).toHaveURL(/order-history-page/);
    await page.waitForTimeout(1700);

    expect(state.orderCreatePayloads).toHaveLength(0);
  });

  test('keeps the draft order unchanged when the cash dialog is cancelled', async ({
    page,
  }) => {
    bindBrowserDiagnostics(page);
    const state = await createPosApiMock(page);

    await bootstrapPosBrowser(page);
    await page.goto('/checkout?id=123');

    await expect(page.getByText('#123', {exact: true}).last()).toBeVisible();
    await expect(page.getByText(/R\$\s*12,50/).last()).toBeVisible();
    await page.getByText(/^Receber em dinheiro$/i).click();

    await expect(page.getByText('Pagamento em dinheiro', {exact: true})).toBeVisible();
    await expect(page.getByText('Total a cobrar: R$ 12,50', {exact: true})).toBeVisible();
    await page.getByText(/^(Cancel|Cancelar)$/).click();

    await expect(page).toHaveURL(/checkout/);
    await expect(page.getByText('#123', {exact: true}).last()).toBeVisible();
    await expect(page.getByText(/R\$\s*12,50/).last()).toBeVisible();
    expect(state.invoices).toHaveLength(0);
    expect(state.lastInvoicePayload).toBeNull();
    expect(state.order).toMatchObject({
      id: 123,
      orderType: 'cart',
      price: 12.5,
      status: {
        status: 'open',
        realStatus: 'open',
      },
    });
  });

  test('returns from the checkout title to the same single-item draft', async ({
    page,
  }) => {
    bindBrowserDiagnostics(page);
    const product = createProduct(101, {
      product: 'Coxinha',
      description: 'Produto unico do modo single-item',
      price: 12.5,
    });
    const existingProduct = createProduct(102, {
      product: 'Suco',
      description: 'Item inicial da mesma order',
      price: 8.9,
    });
    const state = await createPosApiMock(page, {
      productOne: product,
      productTwo: existingProduct,
      order: createOpenOrder({id: 123, products: [existingProduct], price: 8.9}),
    });

    await bootstrapPosBrowser(page);
    await page.goto(
      '/add-product-screen?id=123&resumeExistingOrder=true&singleItemMode=true',
    );
    await clickProduct(page, 'Coxinha');
    await openCheckoutWithSelectedProducts(page);

    await expect(page).toHaveURL(/checkout/);
    await expect(page.getByText('#123', {exact: true}).last()).toBeVisible();
    await expect(page.getByText(/R\$\s*12,50/).last()).toBeVisible();
    state.orderItemIncludesProducts = false;

    const checkoutBack = page.getByLabel('Voltar ao catalogo');
    await expect(checkoutBack).toHaveCount(1);
    await checkoutBack.click();

    await expect(page).toHaveURL(/products-page|pdv-page/);
    await expect(page.getByText(/R\$\s*12,50/).last()).toBeVisible();
    await expect(page.getByText('Conferir pedido', {exact: true}).last()).toBeVisible();

    const returnUrl = new URL(page.url());
    expect(returnUrl.searchParams.get('id')).toBe('123');
    expect(returnUrl.searchParams.get('resumeExistingOrder')).toBe('true');
    expect(state.orderCreatePayloads).toHaveLength(0);
    expect(state.order).toMatchObject({id: 123, price: 12.5});

    await expect(page.getByText('Conferir pedido', {exact: true}).last()).toBeVisible();
  });

  test('hydrates order products when the checkout back action resumes the draft', async ({
    page,
  }) => {
    bindBrowserDiagnostics(page);
    const product = createProduct(101, {
      product: 'Coxinha',
      description: 'Produto unico do modo single-item',
      price: 12.5,
    });
    const existingProduct = createProduct(102, {
      product: 'Suco',
      description: 'Item inicial da mesma order',
      price: 8.9,
    });
    const state = await createPosApiMock(page, {
      productOne: product,
      productTwo: existingProduct,
      order: createOpenOrder({id: 123, products: [existingProduct], price: 8.9}),
      orderProductsDelayMs: 250,
    });

    await bootstrapPosBrowser(page);
    await page.goto(
      '/add-product-screen?id=123&resumeExistingOrder=true&singleItemMode=true',
    );
    await clickProduct(page, 'Coxinha');
    await openCheckoutWithSelectedProducts(page);
    await expect(page).toHaveURL(/checkout/);
    state.orderItemIncludesProducts = false;

    const checkoutBack = page.getByLabel('Voltar ao catalogo');
    await expect(checkoutBack).toHaveCount(1);
    await checkoutBack.click();

    await expect(page).toHaveURL(/products-page|pdv-page/);
    await expect(page).toHaveURL(/resumeExistingOrder=true/);
    const visibleZeroTotals = await page.getByText(/R\$\s*0,00/).evaluateAll(nodes =>
      nodes.filter(node => {
        const style = window.getComputedStyle(node);
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          node.getClientRects().length > 0
        );
      }).length,
    );
    expect(visibleZeroTotals).toBe(0);
    await expect(page.getByText(/R\$\s*12,50/).last()).toBeVisible();
    await expect(page.getByText('Conferir pedido', {exact: true}).last()).toBeVisible();
    expect(state.orderProductRequests).toContainEqual({'order.id': '123'});
    expect(state.orderCreatePayloads).toHaveLength(0);
  });

  test('shows cash and Cielo payment options and returns to the history list after payment', async ({
    page,
  }) => {
    bindBrowserDiagnostics(page);
    const state = await createPosApiMock(page);

    await bootstrapPosBrowser(page);

    await page.goto('/checkout?id=123');

    await expect(page).toHaveURL(/checkout/);
    await expect(page.getByText(/^Dinheiro$/i).first()).toBeVisible();
    await expect(page.getByText(/^Crédito Cielo$/i).first()).toBeVisible();
    await expect(page.getByText(/^Receber em dinheiro$/i)).toBeVisible();

    const invoiceRequestPromise = page.waitForRequest(request =>
      request.url().endsWith('/invoices') &&
      request.method() === 'POST',
    );

    await page.getByText(/^Receber em dinheiro$/i).click();
    await expect(page.getByPlaceholder('Ex.: 50,00')).toBeVisible();

    await page.getByPlaceholder('Ex.: 50,00').fill('12,50');
    await page.getByText(/^(Confirmar|Confirm)$/i).click();

    const invoiceRequest = await invoiceRequestPromise;
    expect(invoiceRequest.postDataJSON().price).toBe(12.5);

    await expect(page).toHaveURL(/order-history-page/);
  });

  test('sends the Cielo payment to the remote machine and returns after the websocket callback', async ({
    page,
  }) => {
    bindBrowserDiagnostics(page);
    const state = await createPosApiMock(page);

    await bootstrapPosBrowser(page);

    await page.goto('/checkout?id=123');

    await expect(page.getByText(/^Dinheiro$/i).first()).toBeVisible();
    await expect(page.getByText(/^Crédito Cielo$/i).first()).toBeVisible();

    const websocketRequestPromise = page.waitForRequest(request =>
      request.url().endsWith('/websocket') &&
      request.method() === 'POST',
    );

    await page.getByText(/^Crédito Cielo$/i).nth(1).click();
    await expect(page.getByText('Enviar para Cielo Principal', { exact: true })).toBeVisible();
    await page.getByText('Enviar para Cielo Principal', { exact: true }).first().click();
    await page.getByText('Continuar', { exact: true }).click();

    const websocketRequest = await websocketRequestPromise;
    const websocketPayload = websocketRequest.postDataJSON();

    await page.waitForFunction(
      () => typeof window.__codexInjectInvoiceMessage === 'function',
    );

    await page.evaluate(
      message => window.__codexInjectInvoiceMessage(message),
      buildRemotePaymentResultMessage({
        invoiceId: state.nextInvoiceId,
        orderId: 123,
        paidAmount: 12.5,
        payment: state.paymentOptions[1],
        requestKey: websocketPayload.requestKey,
        targetDeviceId: 'cielo-1',
        targetDeviceLabel: 'Cielo Principal',
        targetGateway: 'cielo',
      }),
    );

    await expect(page).toHaveURL(/order-history-page/);
  });

  test('opens the order history list and renders the existing order row', async ({ page }) => {
    bindBrowserDiagnostics(page);
    await createPosApiMock(page);

    await bootstrapPosBrowser(page);
    await page.goto('/order-history-page');

    await expect(page).toHaveURL(/order-history-page/);
    await expect(page.getByText(/Historico de pedidos|Order History/i)).toBeVisible();
    await expect(page.getByText('#123', { exact: true })).toBeVisible();
    await expect(page.getByText(/Cart/i).first()).toBeVisible();
  });

  test('creates an invoice from the order history action without Cielo', async ({
    page,
  }) => {
    bindBrowserDiagnostics(page);
    const state = await createPosApiMock(page);

    await bootstrapPosBrowser(page);
    await page.goto('/checkout?id=123');

    await expect(page).toHaveURL(/checkout/);
    await expect(page.getByText(/R\$\s*12,50/).last()).toBeVisible();
    const invoiceRequestPromise = page.waitForRequest(request =>
      request.url().endsWith('/invoices') &&
      request.method() === 'POST',
    );
    await page.getByText(/^Receber em dinheiro$/i).click();
    await page.getByPlaceholder('Ex.: 50,00').fill('12,50');
    await page.getByText(/^(Confirmar|Confirm)$/i).click();

    const invoiceRequest = await invoiceRequestPromise;
    expect(invoiceRequest.postDataJSON()).toMatchObject({
      order: '/orders/123',
      price: 12.5,
    });
    await expect(page).toHaveURL(/order-history-page/);
  });

  test('bootstraps period translations after a direct authenticated reload', async ({page}) => {
    bindBrowserDiagnostics(page);
    await createPosApiMock(page);

    await bootstrapPosBrowser(page);
    await page.goto('/order-history-page');
    await expect(page.getByText('#123', {exact: true})).toBeVisible();

    await page.reload();
    await expect(
      page.getByText(/Historico de pedidos|Order History/i),
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => typeof globalThis.t?.t))
      .toBe('function');

    const periodLabels = await page.evaluate(() => [
      globalThis.t?.t('orders', 'label', 'period_all'),
      globalThis.t?.t('orders', 'label', 'period_today'),
      globalThis.t?.t('users', 'date', 'yesterday'),
      globalThis.t?.t('orders', 'label', 'period_7d'),
      globalThis.t?.t('orders', 'label', 'period_30d'),
      globalThis.t?.t('orders', 'label', 'period_custom'),
    ]);

    expect(periodLabels).toEqual([
      'Period all',
      'Period today',
      'Yesterday',
      'Period 7d',
      'Period 30d',
      'Period custom',
    ]);
  });

  test('hides the order history toolbar and requests only open device orders on POS device scope', async ({ page }) => {
    bindBrowserDiagnostics(page);
    await page.setViewportSize({width: 375, height: 667});
    await createPosApiMock(page);

    await bootstrapPosBrowser(page);

    const ordersRequestPromise = page.waitForRequest(request => {
      const url = new URL(request.url());

      return request.method() === 'GET' &&
        url.pathname.endsWith('/orders') &&
        url.searchParams.get('device.device') === 'web-7' &&
        url.searchParams.get('status.realStatus') === 'open';
    });

    await page.goto('/order-history-page');
    await ordersRequestPromise;

    const searchButton = page.getByRole('button', {name: /search|buscar/i});
    await expect(searchButton).toBeHidden();
    await expect(page.getByRole('button', {name: /add|adicionar/i})).toBeVisible();
  });
});
