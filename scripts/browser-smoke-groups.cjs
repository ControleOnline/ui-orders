const flows = require('./browser-smoke-flows.cjs');

const appTypes = [
  ['manager', 'MANAGER'],
  ['admin', 'ADMIN'],
  ['delivery', 'DELIVERY'],
  ['pos', 'POS'],
];

const unique = values => [...new Set(values.filter(Boolean))];
const pathMatchesGroup = (testPath, groupName) =>
  String(testPath || '').includes(`/src/tests/browser/${groupName}`);

module.exports = appTypes.map(([name, appType]) => {
  const matchingFlows = flows.filter(flow => flow.appTypes.includes(appType));
  const testPaths =
    name === 'manager'
      ? [
          'modules/controleonline/ui-login/src/tests/browser/manager/login-flow.spec.js',
          'modules/controleonline/ui-crm/src/tests/browser/manager/general-settings-maps-complete.spec.js',
        ]
      : name === 'pos'
      ? ['modules/controleonline/ui-orders/src/tests/browser/pos/single-item-checkout.spec.js']
      : unique(
          matchingFlows
            .flatMap(flow => flow.testPaths)
            .filter(testPath => pathMatchesGroup(testPath, name)),
        );

  return {
    name,
    appType,
    flowIds: matchingFlows.map(flow => flow.id),
    testPaths,
  };
});
