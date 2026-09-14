const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const testsRoot = path.join(projectRoot, 'tests');
const automatedReportPath = path.join(testsRoot, 'automated', 'jest-results.json');
const smokeResultsRoot = path.join(testsRoot, 'smoke', 'results');
const artifactsRoot = path.join(testsRoot, 'artifacts');
const indexPath = path.join(testsRoot, 'index.json');

const typeLabels = new Map([
  ['automated', 'Automated'],
  ['browser-smoke', 'Browser Smoke'],
  ['integration', 'Integration'],
  ['jest', 'Automated'],
  ['junit', 'JUnit'],
  ['phpunit', 'PHPUnit'],
  ['unit', 'Unit'],
]);

function ensureDir(dir) {
  fs.mkdirSync(dir, {recursive: true});
}

function cleanDir(dir) {
  fs.rmSync(dir, {recursive: true, force: true});
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return null;
  }
}

function writeJson(filePath, payload) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizePathValue(value) {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
}

function normalizeRelativePath(value) {
  const normalized = normalizePathValue(value);

  if (normalized === '') {
    return '';
  }

  const segments = normalized.split('/').filter((segment) => segment !== '' && segment !== '.' && segment !== '..');

  return segments.join('/');
}

function stripSourcePrefix(value) {
  const normalized = normalizeRelativePath(value);
  const browserPrefix = 'src/tests/browser/';
  const browserIndex = normalized.indexOf(browserPrefix);

  if (browserIndex >= 0) {
    return normalized.slice(browserIndex + browserPrefix.length);
  }

  return normalized
    .replace(/^src\/tests\/browser\//, '')
    .replace(/^src\/tests\//, '')
    .replace(/^tests\//, '')
    .replace(/^src\//, '');
}

function stripExtension(value) {
  const normalized = normalizeRelativePath(value);
  const extension = path.posix.extname(normalized);

  if (!extension) {
    return normalized;
  }

  return normalized.slice(0, -extension.length);
}

function stripTestSuffix(value) {
  return stripExtension(value).replace(/(\.spec|\.test|\.e2e|\.smoke)$/i, '');
}

function encodeSuiteId(suitePath) {
  const normalized = normalizeRelativePath(suitePath);

  if (normalized === '') {
    return '';
  }

  return Buffer.from(normalized, 'utf8').toString('base64url');
}

function humanizeLabel(value) {
  const raw = String(value || '').trim();

  if (raw === '') {
    return 'Sem nome';
  }

  const normalizedKey = raw
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  if (typeLabels.has(normalizedKey)) {
    return typeLabels.get(normalizedKey);
  }

  return raw
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function stripAnsi(value) {
  return String(value || '').replace(/\u001b\[[0-9;]*m/g, '');
}

function toCount(value) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function countSummary(tests) {
  let total = 0;
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    total += 1;

    if (test.status === 'passed') {
      passed += 1;
    } else {
      failed += 1;
    }
  }

  return {total, passed, failed};
}

function statusFromSummary(summary) {
  if (summary.total === 0) {
    return 'idle';
  }

  return summary.failed === 0 ? 'passed' : 'failed';
}

function reportTimestamp(report, fallbackPath) {
  const candidates = [
    report?.generatedAt,
    report?.updatedAt,
    report?.stats?.startTime,
    report?.startTime,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      const timestamp = Date.parse(candidate);
      if (!Number.isNaN(timestamp)) {
        return timestamp;
      }
    }

    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
      return candidate;
    }
  }

  try {
    return fs.statSync(fallbackPath).mtimeMs;
  } catch {
    return 0;
  }
}

function resolveGeneratedAt(report, fallbackPath) {
  const timestamp = reportTimestamp(report, fallbackPath);

  if (timestamp > 0) {
    return new Date(timestamp).toISOString();
  }

  return new Date().toISOString();
}

function resolveOutputDir(report, fallbackPath) {
  const configuredOutputDir = report?.config?.projects?.[0]?.outputDir;

  if (typeof configuredOutputDir === 'string' && configuredOutputDir.trim() !== '') {
    return configuredOutputDir;
  }

  return path.dirname(fallbackPath);
}

function resolveRelativeSourcePath(absolutePath, outputDir) {
  const normalizedOutputDir = normalizePathValue(outputDir);
  const normalizedPath = normalizePathValue(absolutePath);

  if (normalizedOutputDir !== '') {
    const relative = path.relative(normalizedOutputDir, normalizedPath);
    if (relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)) {
      return normalizeRelativePath(relative);
    }
  }

  const marker = `${normalizePathValue(path.basename(outputDir))}/`;
  const markerIndex = normalizedPath.lastIndexOf(marker);
  if (markerIndex >= 0) {
    return normalizeRelativePath(normalizedPath.slice(markerIndex + marker.length));
  }

  return normalizeRelativePath(path.basename(normalizedPath));
}

function copyFileToArtifact(sourcePath, destinationPath) {
  ensureDir(path.dirname(destinationPath));
  fs.copyFileSync(sourcePath, destinationPath);
}

function findManifestForSuite(reportDir, suite) {
  const candidates = [];
  const stack = [reportDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    for (const entry of fs.readdirSync(currentDir, {withFileTypes: true})) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.name === 'manifest.json') {
        candidates.push(fullPath);
      }
    }
  }

  const screenshotNames = new Set(
    (Array.isArray(suite?.tests) ? suite.tests : [])
      .flatMap(test => Array.isArray(test?.screenshots) ? test.screenshots : [])
      .map(screenshot => String(screenshot?.name || '').replace(/\.png$/i, '')),
  );

  for (const candidate of candidates.sort()) {
    const manifest = readJson(candidate);
    const prints = Array.isArray(manifest?.prints) ? manifest.prints : [];
    if (prints.some(print => screenshotNames.has(String(print)))) {
      return candidate;
    }
  }

  return candidates.sort()[0] || null;
}

function artifactUrlForSuite(suiteId, relativePath) {
  return `/tests/artifacts/${encodeURIComponent(suiteId)}/${normalizeRelativePath(relativePath)
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`;
}

function guessMimeType(relativePath, contentType) {
  if (typeof contentType === 'string' && contentType.trim() !== '') {
    return contentType.split(';')[0].trim();
  }

  switch (path.posix.extname(normalizeRelativePath(relativePath)).toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.bmp':
      return 'image/bmp';
    case '.avif':
      return 'image/avif';
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.json':
      return 'application/json';
    case '.md':
    case '.txt':
      return 'text/plain; charset=UTF-8';
    default:
      return 'application/octet-stream';
  }
}

function normalizeStatus(value) {
  const status = String(value || '').trim().toLowerCase();

  if (status === 'passed' || status === 'success' || status === 'expected') {
    return 'passed';
  }

  return 'failed';
}

function buildStep(step, outputDir, reportDir, suiteId, copiedArtifacts) {
  const attachments = Array.isArray(step?.attachments) ? step.attachments : [];
  const screenshots = [];

  for (const attachment of attachments) {
    if (!attachment || typeof attachment !== 'object' || typeof attachment.path !== 'string' || attachment.path.trim() === '') {
      continue;
    }

    if (!String(attachment.contentType || '').startsWith('image/')) {
      continue;
    }

    const relativePath = resolveRelativeSourcePath(attachment.path, outputDir);
    const sourcePath = path.join(reportDir, ...normalizeRelativePath(relativePath).split('/'));
    const destinationPath = path.join(artifactsRoot, suiteId, ...normalizeRelativePath(relativePath).split('/'));

    if (!copiedArtifacts.has(destinationPath) && fs.existsSync(sourcePath)) {
      copyFileToArtifact(sourcePath, destinationPath);
      copiedArtifacts.add(destinationPath);
    }

    screenshots.push({
      label: String(attachment.name || path.basename(relativePath)).trim() || path.basename(relativePath),
      name: path.basename(relativePath),
      url: artifactUrlForSuite(suiteId, relativePath),
      mimeType: guessMimeType(relativePath, attachment.contentType),
      kind: 'image',
      available: true,
    });
  }

  const nestedSteps = Array.isArray(step?.steps)
    ? step.steps.map((nestedStep) => buildStep(nestedStep, outputDir, reportDir, suiteId, copiedArtifacts))
    : [];
  const hasError = isObject(step?.error);
  const stepStatus = normalizeStatus(step?.status || (hasError ? 'failed' : 'passed'));

  return {
    title: String(step?.title || 'Etapa').trim() || 'Etapa',
    status: stepStatus,
    error: hasError ? stripAnsi(step.error.message || step.error.stack || '') : null,
    screenshots,
    steps: nestedSteps,
  };
}

function buildPlaywrightTest(spec, outputDir, reportDir, suiteId, copiedArtifacts) {
  const tests = Array.isArray(spec?.tests) ? spec.tests : [];
  const testCase = tests[0] || null;
  const results = Array.isArray(testCase?.results) ? testCase.results : [];
  const result = results[results.length - 1] || {};
  const resultAttachments = Array.isArray(result.attachments) ? result.attachments : [];
  const screenshots = [];
  const steps = Array.isArray(result.steps)
    ? result.steps.map((step) => buildStep(step, outputDir, reportDir, suiteId, copiedArtifacts))
    : [];
  let error = null;

  for (const attachment of resultAttachments) {
    if (!attachment || typeof attachment !== 'object' || typeof attachment.path !== 'string' || attachment.path.trim() === '') {
      continue;
    }

    if (!String(attachment.contentType || '').startsWith('image/')) {
      continue;
    }

    const relativePath = resolveRelativeSourcePath(attachment.path, outputDir);
    const sourcePath = path.join(reportDir, ...normalizeRelativePath(relativePath).split('/'));
    const destinationPath = path.join(artifactsRoot, suiteId, ...normalizeRelativePath(relativePath).split('/'));

    if (!copiedArtifacts.has(destinationPath) && fs.existsSync(sourcePath)) {
      copyFileToArtifact(sourcePath, destinationPath);
      copiedArtifacts.add(destinationPath);
    }

    screenshots.push({
      label: String(attachment.name || path.basename(relativePath)).trim() || path.basename(relativePath),
      name: path.basename(relativePath),
      url: artifactUrlForSuite(suiteId, relativePath),
      mimeType: guessMimeType(relativePath, attachment.contentType),
      kind: 'image',
      available: true,
    });
  }

  if (Array.isArray(result.errors) && result.errors.length > 0) {
    error = stripAnsi(result.errors[0]?.message || '');
  } else if (isObject(result.error)) {
    error = stripAnsi(result.error.message || result.error.stack || '');
  }

  return {
    title: String(spec?.title || 'Teste').trim() || 'Teste',
    status: normalizeStatus(result.status || (spec?.ok ? 'passed' : 'failed')),
    error: error && error.trim() !== '' ? error : null,
    screenshots,
    steps,
  };
}

function collectPlaywrightSpecs(suite) {
  const specs = [];

  if (Array.isArray(suite?.specs)) {
    specs.push(...suite.specs);
  }

  if (Array.isArray(suite?.suites)) {
    for (const childSuite of suite.suites) {
      specs.push(...collectPlaywrightSpecs(childSuite));
    }
  }

  return specs;
}

function parsePlaywrightReport(reportPath, report, rootPath) {
  const relativeReportDir = normalizeRelativePath(path.relative(smokeResultsRoot, reportPath));
  const groupName = relativeReportDir.split('/').filter(Boolean)[0] || 'browser';
  const reportDir = path.dirname(reportPath);
  const outputDir = resolveOutputDir(report, reportPath);
  const rootSuites = Array.isArray(report?.suites) ? report.suites : [];
  const copiedArtifacts = new Set();
  const suites = [];

  for (const rootSuite of rootSuites) {
    if (!isObject(rootSuite) || typeof rootSuite.file !== 'string' || rootSuite.file.trim() === '') {
      continue;
    }

    const relativeFile = path.isAbsolute(rootSuite.file)
      ? normalizeRelativePath(path.relative(projectRoot, rootSuite.file))
      : normalizeRelativePath(rootSuite.file);
    const strippedFile = stripSourcePrefix(relativeFile);
    const canonicalBrowserPath = normalizeRelativePath(strippedFile || stripExtension(path.basename(reportPath)));
    const suitePath = normalizeRelativePath(
      `browser-smoke/${stripTestSuffix(
        canonicalBrowserPath.startsWith(`${groupName}/`)
          ? canonicalBrowserPath
          : `${groupName}/${canonicalBrowserPath}`,
      )}`,
    );
    const suiteId = encodeSuiteId(suitePath);
    const specs = collectPlaywrightSpecs(rootSuite);
    const tests = specs.map((spec) => buildPlaywrightTest(spec, outputDir, reportDir, suiteId, copiedArtifacts));
    const summary = countSummary(tests);
    const generatedAt = resolveGeneratedAt(report, reportPath);
    const displayName = humanizeLabel(
      stripTestSuffix(path.basename(canonicalBrowserPath || relativeFile || rootSuite.title || groupName)),
    );

    const reportPayload = {
      type: 'browser-smoke',
      typeDisplayName: humanizeLabel('browser-smoke'),
      suite: stripTestSuffix(path.basename(canonicalBrowserPath || relativeFile || rootSuite.title || 'suite')),
      suitePath,
      suiteId,
      displayName,
      generatedAt,
      updatedAt: generatedAt,
      status: statusFromSummary(summary),
      summary,
      tests,
      error: tests.find((test) => test.status !== 'passed')?.error || null,
      links: {
        report: `/tests/artifacts/${suiteId}/report.json`,
      },
    };

    const manifestPath = findManifestForSuite(reportDir, {tests});
    if (manifestPath) {
      copyFileToArtifact(manifestPath, path.join(artifactsRoot, suiteId, 'manifest.json'));
      reportPayload.links.manifest = `/tests/artifacts/${suiteId}/manifest.json`;
    }

    suites.push(reportPayload);

    const destinationPath = path.join(artifactsRoot, suiteId, 'report.json');
    ensureDir(path.dirname(destinationPath));
    writeJson(destinationPath, reportPayload);
  }

  return suites;
}

function parseJestAssertion(assertion) {
  const rawStatus = String(assertion?.status || '').trim().toLowerCase();
  const status = rawStatus === 'passed' ? 'passed' : 'failed';
  const failureMessages = Array.isArray(assertion?.failureMessages) ? assertion.failureMessages : [];

  return {
    title: [
      ...(Array.isArray(assertion?.ancestorTitles) ? assertion.ancestorTitles : []),
      String(assertion?.title || 'Teste').trim() || 'Teste',
    ].join(' :: '),
    status,
    error: failureMessages.length > 0 ? stripAnsi(failureMessages[0]) : null,
    screenshots: [],
    steps: [],
  };
}

function parseJestReport(reportPath, report) {
  const testResults = Array.isArray(report?.testResults) ? report.testResults : [];
  const suites = [];
  const generatedAt = resolveGeneratedAt(report, reportPath);

  for (const testResult of testResults) {
    const filePath = typeof testResult?.name === 'string' && testResult.name.trim() !== ''
      ? testResult.name
      : typeof testResult?.testFilePath === 'string' && testResult.testFilePath.trim() !== ''
        ? testResult.testFilePath
        : typeof testResult?.path === 'string' && testResult.path.trim() !== ''
          ? testResult.path
          : '';

    const relativeFile = path.isAbsolute(filePath)
      ? normalizeRelativePath(path.relative(projectRoot, filePath))
      : normalizeRelativePath(filePath);
    const strippedFile = stripSourcePrefix(relativeFile);
    const suitePath = normalizeRelativePath(`automated/${stripTestSuffix(strippedFile || path.basename(reportPath, '.json'))}`);
    const suiteId = encodeSuiteId(suitePath);
    const tests = (Array.isArray(testResult?.assertionResults) ? testResult.assertionResults : []).map(parseJestAssertion);
    const summary = countSummary(tests);
    const displayName = humanizeLabel(stripTestSuffix(path.basename(strippedFile || path.basename(reportPath, '.json'))));

    const reportPayload = {
      type: 'automated',
      typeDisplayName: humanizeLabel('automated'),
      suite: stripTestSuffix(path.basename(strippedFile || path.basename(reportPath, '.json'))) || 'suite',
      suitePath,
      suiteId,
      displayName,
      generatedAt,
      updatedAt: generatedAt,
      status: statusFromSummary(summary),
      summary,
      tests,
      error: tests.find((test) => test.status !== 'passed')?.error || null,
      links: {
        report: `/tests/artifacts/${suiteId}/report.json`,
      },
    };

    suites.push(reportPayload);

    const destinationPath = path.join(artifactsRoot, suiteId, 'report.json');
    ensureDir(path.dirname(destinationPath));
    writeJson(destinationPath, reportPayload);
  }

  return suites;
}

function buildInvalidSuite(reportPath, type, message) {
  const generatedAt = resolveGeneratedAt(null, reportPath);
  const suiteName = path.basename(reportPath, '.json') || path.basename(reportPath);
  const suitePath = normalizeRelativePath(`${type}/${stripTestSuffix(suiteName) || 'invalid'}`);
  const suiteId = encodeSuiteId(suitePath);
  const reportPayload = {
    type,
    typeDisplayName: humanizeLabel(type),
    suite: suiteName,
    suitePath,
    suiteId,
    displayName: humanizeLabel(stripExtension(suiteName) || suiteName),
    generatedAt,
    updatedAt: generatedAt,
    status: 'failed',
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
    },
    tests: [],
    error: message,
    links: {
      report: `/tests/artifacts/${suiteId}/report.json`,
    },
  };

  const destinationPath = path.join(artifactsRoot, suiteId, 'report.json');
  ensureDir(path.dirname(destinationPath));
  writeJson(destinationPath, reportPayload);

  return [reportPayload];
}

function collectReportFiles(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const files = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    const entries = fs.readdirSync(currentDir, {withFileTypes: true});

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      const normalizedName = entry.name.toLowerCase();
      if (normalizedName === 'report.json') {
        files.push(fullPath);
      }
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function buildCanonicalIndex(suites) {
  const sortedSuites = [...suites].sort((left, right) => {
    const rightTime = Number(right?.updatedAt ? Date.parse(right.updatedAt) : 0) || Number(right?.generatedAt ? Date.parse(right.generatedAt) : 0) || 0;
    const leftTime = Number(left?.updatedAt ? Date.parse(left.updatedAt) : 0) || Number(left?.generatedAt ? Date.parse(left.generatedAt) : 0) || 0;

    return rightTime - leftTime || String(left?.suiteId || left?.suite || '').localeCompare(String(right?.suiteId || right?.suite || ''));
  });

  if (sortedSuites.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      status: 'idle',
      progress: 0,
      message: 'Nenhum relatório publicado ainda.',
      lastRunAt: null,
      summary: {
        types: {total: 0, passed: 0, failed: 0},
        suites: {total: 0, passed: 0, failed: 0},
        tests: {total: 0, passed: 0, failed: 0},
      },
      types: [],
      suites: [],
      links: {
        self: '/tests',
        artifacts: '/tests/artifacts',
      },
    };
  }

  const groupedTypes = new Map();

  for (const suite of sortedSuites) {
    const type = String(suite?.type || 'general').trim() || 'general';
    if (!groupedTypes.has(type)) {
      groupedTypes.set(type, []);
    }

    groupedTypes.get(type).push(suite);
  }

  const types = [];

  for (const [type, typeSuites] of groupedTypes.entries()) {
    const suiteSummary = countSummary(typeSuites.map((suite) => ({status: suite.status})));
    const testSummary = countSummary(typeSuites.flatMap((suite) => Array.isArray(suite.tests) ? suite.tests : []));

    types.push({
      type,
      displayName: String(typeSuites[0]?.typeDisplayName || humanizeLabel(type)).trim() || humanizeLabel(type),
      status: statusFromSummary(suiteSummary),
      progress: testSummary.total > 0 ? Math.round((testSummary.passed * 100) / testSummary.total) : 0,
      message: buildTypeMessage(suiteSummary, testSummary),
      summary: {
        suites: suiteSummary,
        tests: testSummary,
      },
      suites: typeSuites,
    });
  }

  types.sort((left, right) => {
    const leftTime = Math.max(...(left.suites || []).map((suite) => Date.parse(suite.generatedAt || suite.updatedAt || 0) || 0), 0);
    const rightTime = Math.max(...(right.suites || []).map((suite) => Date.parse(suite.generatedAt || suite.updatedAt || 0) || 0), 0);

    return rightTime - leftTime || String(left.displayName || left.type || '').localeCompare(String(right.displayName || right.type || ''));
  });

  const suiteSummary = countSummary(sortedSuites.map((suite) => ({status: suite.status})));
  const testSummary = countSummary(sortedSuites.flatMap((suite) => Array.isArray(suite.tests) ? suite.tests : []));
  const typeSummary = countSummary(types.map((type) => ({status: type.status})));
  const lastRunAtTimestamp = Math.max(
    ...sortedSuites.map((suite) => Date.parse(suite.generatedAt || suite.updatedAt || 0) || 0),
    0,
  );

  return {
    generatedAt: new Date().toISOString(),
    status: statusFromSummary(suiteSummary),
    progress: testSummary.total > 0 ? Math.round((testSummary.passed * 100) / testSummary.total) : 0,
    message: buildMessage(suiteSummary, testSummary),
    lastRunAt: lastRunAtTimestamp > 0 ? new Date(lastRunAtTimestamp).toISOString() : null,
    summary: {
      types: typeSummary,
      suites: suiteSummary,
      tests: testSummary,
    },
    types,
    suites: sortedSuites,
    links: {
      self: '/tests',
      artifacts: '/tests/artifacts',
    },
  };
}

function buildMessage(suiteSummary, testSummary) {
  if (suiteSummary.total === 0) {
    return 'Nenhum relatório publicado ainda.';
  }

  if (suiteSummary.failed === 0) {
    return `${suiteSummary.total} suite${suiteSummary.total === 1 ? '' : 's'} publicada${suiteSummary.total === 1 ? '' : 's'} com sucesso e ${testSummary.passed} teste${testSummary.passed === 1 ? '' : 's'} passaram.`;
  }

  return `${suiteSummary.failed} suite${suiteSummary.failed === 1 ? '' : 's'} com falha em ${suiteSummary.total} publicad${suiteSummary.total === 1 ? 'a' : 'as'}.`;
}

function buildTypeMessage(suiteSummary, testSummary) {
  if (suiteSummary.total === 0) {
    return 'Nenhuma suite publicada neste tipo.';
  }

  if (suiteSummary.failed === 0) {
    return `${suiteSummary.total} suite${suiteSummary.total === 1 ? '' : 's'} publicada${suiteSummary.total === 1 ? '' : 's'} e ${testSummary.passed} teste${testSummary.passed === 1 ? '' : 's'} passaram.`;
  }

  return `${suiteSummary.failed} suite${suiteSummary.failed === 1 ? '' : 's'} com falha em ${suiteSummary.total} publicad${suiteSummary.total === 1 ? 'a' : 'as'}.`;
}

function collectSuitesFromReports() {
  const suites = [];

  if (fs.existsSync(automatedReportPath)) {
    const jestReport = readJson(automatedReportPath);

    if (jestReport && Array.isArray(jestReport.testResults)) {
      suites.push(...parseJestReport(automatedReportPath, jestReport));
    } else {
      suites.push(...buildInvalidSuite(automatedReportPath, 'automated', 'O arquivo Jest report não pôde ser lido.'));
    }
  }

  for (const reportPath of collectReportFiles(smokeResultsRoot)) {
    const report = readJson(reportPath);

    if (report && Array.isArray(report.suites) && isObject(report.config)) {
      suites.push(...parsePlaywrightReport(reportPath, report, smokeResultsRoot));
      continue;
    }

    suites.push(...buildInvalidSuite(reportPath, 'browser-smoke', 'O arquivo Playwright report não pôde ser lido.'));
  }

  return suites;
}

function main() {
  cleanDir(artifactsRoot);
  ensureDir(artifactsRoot);

  const suites = collectSuitesFromReports();
  const index = buildCanonicalIndex(suites);

  writeJson(indexPath, index);
  console.log(`Published ${index.suites.length} suites to ${path.relative(projectRoot, indexPath)}`);
}

main();
