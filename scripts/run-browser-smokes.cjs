const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const groups = require('./browser-smoke-groups.cjs');

const projectRoot = path.resolve(__dirname, '..');
const playwrightConfig = path.join(projectRoot, 'playwright.config.cjs');
const buildScript = path.join(projectRoot, 'scripts/playwright-web-build.cjs');
const smokeArtifactsDir = path.resolve(
  projectRoot,
  process.env.PLAYWRIGHT_SMOKE_RESULTS_DIR || '.playwright-smoke-results',
);
const testResultsDir = path.join(projectRoot, 'test-results');
const buildTimeoutMs = Number(process.env.BROWSER_SMOKE_BUILD_TIMEOUT_MS || 10 * 60 * 1000);
const testTimeoutMs = Number(process.env.BROWSER_SMOKE_TEST_TIMEOUT_MS || 25 * 60 * 1000);
const baseWebPort = Number(process.env.PLAYWRIGHT_WEB_PORT || 4173);
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: projectRoot, encoding: 'utf8' }).trim();
const bundleId = `${process.env.npm_package_version || 'app-community'}+${sourceSha.slice(0, 12)}`;

const groupByName = new Map(
  groups.flatMap(group => [
    [group.name, group],
    [group.appType.toLowerCase(), group],
  ]),
);

const args = process.argv.slice(2);
let selectedGroup = null;
const forwardedArgs = [];

for (const arg of args) {
  if (!selectedGroup && !arg.startsWith('-')) {
    const normalized = String(arg || '').trim().toLowerCase();

    if (normalized === 'all') {
      selectedGroup = 'all';
      continue;
    }

    const resolvedGroup = groupByName.get(normalized);
    if (resolvedGroup) {
      selectedGroup = resolvedGroup.name;
      continue;
    }
  }

  forwardedArgs.push(arg);
}

const resolvedGroups =
  selectedGroup && selectedGroup !== 'all'
    ? [groupByName.get(selectedGroup)]
    : groups;

if (resolvedGroups.some(group => !group)) {
  console.error('Unknown browser smoke group. Use manager, admin, delivery, pos, or all.');
  process.exit(1);
}

const ensureDir = dir => {
  fs.mkdirSync(dir, { recursive: true });
};

const cleanDir = dir => {
  fs.rmSync(dir, { recursive: true, force: true });
};

const copyDir = (sourceDir, targetDir) => {
  if (!fs.existsSync(sourceDir)) {
    return false;
  }

  cleanDir(targetDir);
  ensureDir(path.dirname(targetDir));
  fs.cpSync(sourceDir, targetDir, {
    recursive: true,
    force: true,
    dereference: true,
  });
  return true;
};

const runCommand = (command, commandArgs, env, timeout) =>
  spawnSync(command, commandArgs, {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    timeout,
  });

const getExitCode = result => {
  if (result.error?.code === 'ETIMEDOUT') {
    return 'timeout';
  }

  return result.status ?? result.signal ?? 1;
};

cleanDir(smokeArtifactsDir);
ensureDir(smokeArtifactsDir);

const manifest = {
  generatedAt: new Date().toISOString(),
  groups: [],
};
const failures = [];

resolvedGroups.forEach((group, index) => {
  cleanDir(testResultsDir);

  const outputDir = path.join('.playwright-web', group.name);
  const env = {
    ...process.env,
    PLAYWRIGHT_APP_TYPE: group.appType,
    PLAYWRIGHT_WEB_PORT: String(baseWebPort + index),
    PLAYWRIGHT_WEB_OUTPUT_DIR: outputDir,
    PLAYWRIGHT_SMOKE_JSON_OUTPUT_FILE: path.join(testResultsDir, 'report.json'),
    PLAYWRIGHT_SMOKE_BUNDLE_SHA: sourceSha,
    PLAYWRIGHT_SMOKE_BUNDLE_ID: bundleId,
  };
  const groupArtifactsDir = path.join(smokeArtifactsDir, group.name);
  const groupSummary = {
    name: group.name,
    appType: group.appType,
    flowIds: group.flowIds || [],
    build: 'not-run',
    smoke: 'not-run',
    artifacts: [],
  };

  ensureDir(groupArtifactsDir);

  console.log(`\n=== Building ${group.name} browser export (${group.appType}) ===`);
  const buildResult = runCommand(process.execPath, [buildScript], env, buildTimeoutMs);
  const buildExitCode = getExitCode(buildResult);

  if (buildResult.status === 0) {
    groupSummary.build = 'passed';

    console.log(`=== Running ${group.name} browser smoke tests ===`);
    const testPaths = Array.isArray(group.testPaths) ? group.testPaths : [group.testDir].filter(Boolean);
    const testResult = runCommand('npx', [
      'playwright',
      'test',
      '--config',
      playwrightConfig,
      ...testPaths,
      ...forwardedArgs,
    ], env, testTimeoutMs);
    const testExitCode = getExitCode(testResult);

    if (testResult.status === 0) {
      groupSummary.smoke = 'passed';
    } else {
      groupSummary.smoke = `failed (exit ${testExitCode})`;
      failures.push(`[${group.name}] smoke tests failed with exit ${testExitCode}`);
    }
  } else {
    groupSummary.build = `failed (exit ${buildExitCode})`;
    failures.push(`[${group.name}] build failed with exit ${buildExitCode}`);
  }

  if (copyDir(testResultsDir, path.join(groupArtifactsDir, 'test-results'))) {
    groupSummary.artifacts.push('test-results');
  }

  manifest.groups.push(groupSummary);
  fs.writeFileSync(
    path.join(smokeArtifactsDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
});

const summaryLines = [
  `Generated at: ${manifest.generatedAt}`,
  `Groups: ${manifest.groups.length}`,
  'Artifacts include Playwright screenshots, traces, and videos under each group test-results directory.',
  '',
];

for (const group of manifest.groups) {
  summaryLines.push(`${group.name} (${group.appType})`);
  summaryLines.push(`  fluxos: ${(group.flowIds || []).join(', ') || 'none'}`);
  summaryLines.push(`  build: ${group.build}`);
  summaryLines.push(`  smoke: ${group.smoke}`);
  summaryLines.push(`  artifacts: ${group.artifacts.length ? group.artifacts.join(', ') : 'none'}`);
  summaryLines.push('');
}

fs.writeFileSync(
  path.join(smokeArtifactsDir, 'summary.txt'),
  `${summaryLines.join('\n')}\n`,
  'utf8',
);

if (failures.length) {
  console.error('\nBrowser smoke failures:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}
