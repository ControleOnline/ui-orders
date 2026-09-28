import {
  isAndroidKioskEnabled,
  parseConfigsObject,
  resolvePosCheckOrderType,
  resolvePosCheckOrderManagementMode,
  resolvePosOperationMode,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  getPaymentGatewayFromConfigs,
  isPdvPrinterEnabled,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';

const NOT_CONFIGURED = 'Não configurado';

const OPERATION_MODE_LABELS = {
  cashier: 'Caixa',
  counter: 'Balcão',
  'single-item': 'Venda de item único',
  totem: 'Totem',
  waiter: 'Garçom',
};

const CHECK_ORDER_TYPE_LABELS = {
  none: 'Sem vínculo',
  stamp: 'Nome',
  tab: 'Comanda',
  table: 'Mesa',
};

const CHECK_ORDER_MANAGEMENT_LABELS = {
  manage: 'Gerenciar comandas vinculadas',
  'existing-only': 'Somente comandas vinculadas existentes',
};

const safeText = value =>
  value === null || value === undefined ? '' : String(value).trim();

const formatKnownValue = (value, labels) => {
  const normalized = safeText(value);
  if (!normalized) return NOT_CONFIGURED;
  return labels[normalized] ? `${labels[normalized]} (${normalized})` : normalized;
};

const resolveCompanyLabel = company =>
  safeText(company?.alias) ||
  safeText(company?.name) ||
  safeText(company?.id) ||
  NOT_CONFIGURED;

const resolveDeviceLabel = deviceConfig => {
  const device =
    deviceConfig?.device && typeof deviceConfig.device === 'object'
      ? deviceConfig.device
      : {};
  const label =
    safeText(device?.alias) ||
    safeText(device?.name) ||
    safeText(device?.device) ||
    safeText(deviceConfig?.alias) ||
    safeText(deviceConfig?.name);
  const identifier =
    safeText(device?.device) ||
    safeText(device?.id) ||
    safeText(deviceConfig?.deviceId) ||
    safeText(deviceConfig?.device_id) ||
    safeText(deviceConfig?.id);

  if (label && identifier && label !== identifier) {
    return `${label} (${identifier})`;
  }

  return label || identifier || NOT_CONFIGURED;
};

export const resolvePosOperationModuleId = menus => {
  const operationModule = (Array.isArray(menus) ? menus : []).find(module =>
    (Array.isArray(module?.menus) ? module.menus : []).some(
      menu => safeText(menu?.menuKey || menu?.menu_key) === 'orders',
    ),
  );

  return operationModule?.id ?? null;
};

export const buildPosOperationInfo = ({currentCompany, deviceConfig} = {}) => {
  const configs = parseConfigsObject(deviceConfig?.configs);
  const operationMode = resolvePosOperationMode(configs);
  const checkOrderType = resolvePosCheckOrderType(configs);
  const checkOrderManagementMode = resolvePosCheckOrderManagementMode(configs);
  const gateway = getPaymentGatewayFromConfigs(configs);

  return [
    {key: 'company', label: 'Empresa', value: resolveCompanyLabel(currentCompany)},
    {key: 'device', label: 'Device', value: resolveDeviceLabel(deviceConfig)},
    {
      key: 'operation-mode',
      label: 'Modo de operação',
      value: formatKnownValue(operationMode, OPERATION_MODE_LABELS),
    },
    {
      key: 'check-order-type',
      label: 'Vínculo',
      value: formatKnownValue(checkOrderType, CHECK_ORDER_TYPE_LABELS),
    },
    {
      key: 'check-order-management-mode',
      label: 'Gestão do vínculo',
      value: formatKnownValue(
        checkOrderManagementMode,
        CHECK_ORDER_MANAGEMENT_LABELS,
      ),
    },
    {
      key: 'kiosk',
      label: 'Kiosk',
      value: isAndroidKioskEnabled(configs) ? 'Ativo' : 'Inativo',
    },
    {
      key: 'gateway',
      label: 'Gateway',
      value: gateway ? formatKnownValue(gateway, {'cielo': 'Cielo', 'infinite-pay': 'Infinite Pay'}) : NOT_CONFIGURED,
    },
    {
      key: 'printer',
      label: 'Impressora',
      value: isPdvPrinterEnabled(configs) ? 'Ativa' : 'Inativa',
    },
  ];
};
