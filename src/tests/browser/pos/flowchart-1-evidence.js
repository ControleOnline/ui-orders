const fs = require('fs');
const path = require('path');

const FLOWCHART_ID = 1;
const FLOW_ID = 'compra-fluxo';
const FLOWCHART_LINK = `https://admin.controleonline.com/admin/flowcharts/${FLOWCHART_ID}`;

const REQUIRED_PRINT_STEPS = [
  'login',
  'device',
  'pos',
  'produto-no-pedido',
  'checkout-pago',
  'fila-production-ou-conference',
  'ready',
];

const PRODUCTION_STEPS = [
  'queueMaterialization',
  'PPC conference display',
  'Ready (POST /orders/{id}/ready)',
];

const createEvidenceSession = (outputDir) => {
  const resolvedDir = path.resolve(outputDir);
  fs.mkdirSync(resolvedDir, {recursive: true});
  const steps = [];

  const capture = async (page, stepId, title) => {
    const fileName = `${String(steps.length + 1).padStart(2, '0')}-${stepId}.png`;
    const filePath = path.join(resolvedDir, fileName);
    await page.screenshot({path: filePath, fullPage: true});
    steps.push({
      id: stepId,
      title,
      file: fileName,
      url: page.url(),
    });
    return filePath;
  };

  const writeManifest = ({orderId, result}) => {
    const missingPrints = REQUIRED_PRINT_STEPS.filter(
      requiredId => !steps.some(step => step.id === requiredId),
    );
    const manifest = {
      flowchartIds: [FLOWCHART_ID],
      flowchartLinks: [FLOWCHART_LINK],
      fluxo: FLOW_ID,
      suite: 'flowchart-1-single-product-prepaid',
      nodes: [
        'pdvMode',
        'counterFlow',
        'checkout',
        'invoice',
        'saleOrder',
        'queueMaterialization',
        'PPC',
        'ready',
      ],
      productionSteps: PRODUCTION_STEPS,
      orderId,
      result,
      missingPrints,
      steps,
    };
    const manifestPath = path.join(resolvedDir, 'manifest.json');
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    return {manifest, manifestPath, missingPrints};
  };

  return {capture, writeManifest, steps, outputDir: resolvedDir};
};

const assertCompleteEvidence = missingPrints => {
  if (missingPrints.length) {
    throw new Error(
      `Smoke flowchart 1 missing required prints: ${missingPrints.join(', ')}`,
    );
  }
};

module.exports = {
  FLOWCHART_ID,
  FLOWCHART_LINK,
  FLOW_ID,
  REQUIRED_PRINT_STEPS,
  PRODUCTION_STEPS,
  assertCompleteEvidence,
  createEvidenceSession,
};
