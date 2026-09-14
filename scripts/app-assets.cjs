const fs = require('fs');
const path = require('path');

const DEFAULT_APP_TYPE = 'MANAGER';
const ASSETS_ROOT = './src/assets/';

const normalizeAppType = value =>
  String(value || DEFAULT_APP_TYPE)
    .trim()
    .toUpperCase();

const resolveAssetsFolder = (appType, variant) =>
  String(
    variant ||
      (['ADMIN', 'MKT'].includes(normalizeAppType(appType)) ? 'manager' : appType),
  )
    .trim()
    .toLowerCase();

const resolveProjectAssetPath = assetPath =>
  path.join(__dirname, '..', assetPath.replace(/^\.\//, ''));

const updateAssetPath = (currentPath, assetsFolder) => {
  if (typeof currentPath !== 'string' || !currentPath.startsWith(ASSETS_ROOT)) {
    return currentPath;
  }

  const assetName = currentPath.slice(ASSETS_ROOT.length).split('/').pop();
  if (!assetName) {
    return currentPath;
  }

  const nextPath = `${ASSETS_ROOT}${assetsFolder}/${assetName}`;

  return fs.existsSync(resolveProjectAssetPath(nextPath)) ? nextPath : currentPath;
};

module.exports = {
  normalizeAppType,
  resolveAssetsFolder,
  updateAssetPath,
};
