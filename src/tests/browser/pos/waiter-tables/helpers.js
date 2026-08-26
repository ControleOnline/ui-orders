const path = require('path')
const {
  WAITER_TABLES_SMOKE_MANIFEST,
} = require('../../helpers/flowchartAdminPosHelpers')

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots')

const bindBrowserDiagnostics = page => {
  page.on('console', message => {
    if (message.type() === 'error') {
      console.log('[browser console error]', message.text())
    }
  })
  page.on('pageerror', error => {
    console.log('[browser pageerror]', error?.stack || error?.message || String(error))
  })
}

const bootstrapPosBrowser = async page => {
  const pending = [
    page.waitForResponse(response => response.url().includes('/runtime/ip')),
    page.waitForResponse(response => response.url().includes('/people/companies/my')),
    page.waitForResponse(response => response.url().includes('/device_configs')),
  ]
  await page.goto('/')
  await Promise.allSettled(pending)
  await page.waitForTimeout(300)
}

const captureStep = async (page, stepId) => {
  const fileName = `${String(stepId).replace(/[^a-z0-9-]+/gi, '-')}.png`
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, fileName),
    fullPage: true,
  })
  return fileName
}

const browserApi = (page, requestPath, {method = 'GET', body, apiOrigin} = {}) =>
  page.evaluate(
    async ({apiOrigin: origin, path: target, method: requestMethod, body: requestBody}) => {
      const response = await fetch(`${origin}/${String(target).replace(/^\/+/, '')}`, {
        method: requestMethod,
        headers:
          requestBody === undefined
            ? undefined
            : {'content-type': 'application/ld+json'},
        body: requestBody === undefined ? undefined : JSON.stringify(requestBody),
      })
      const text = await response.text()
      let data = null
      try {
        data = text ? JSON.parse(text) : null
      } catch {
        data = text
      }
      return {data, ok: response.ok, status: response.status}
    },
    {apiOrigin, path: requestPath, method, body},
  )

const describeManifest = () =>
  [
    `fluxo: ${WAITER_TABLES_SMOKE_MANIFEST.fluxo}`,
    `flowchartIds: [${WAITER_TABLES_SMOKE_MANIFEST.flowchartIds.join(', ')}]`,
    `steps: ${WAITER_TABLES_SMOKE_MANIFEST.steps.join(' → ')}`,
  ].join('\n')

module.exports = {
  SCREENSHOT_DIR,
  bindBrowserDiagnostics,
  bootstrapPosBrowser,
  browserApi,
  captureStep,
  describeManifest,
}
