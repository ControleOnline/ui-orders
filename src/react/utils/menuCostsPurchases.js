import {normalizeEntityId, resolveOrderProductTotal} from '@controleonline/ui-orders/src/utils/orderState';

export const PURCHASE_HISTORY_PAGE_SIZE = 50;

export const normalizeCollection = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.member)) return response.member;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  return [];
};

const normalizeText = value => String(value || '').trim();

const normalizeSearch = value =>
  normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const toNumber = value => {
  const parsed = Number.parseFloat(String(value ?? 0).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const resolvePeopleLabel = person =>
  normalizeText(
    person?.alias ||
      person?.name ||
      person?.fantasy_name ||
      person?.company ||
      person?.document ||
      '',
  );

export const resolvePurchaseSupplierLabel = order =>
  resolvePeopleLabel(order?.client) || 'Fornecedor';

export const resolvePurchaseOrderLabel = order => {
  const orderId = normalizeEntityId(order);
  return normalizeText(order?.label || order?.documentNumber || `Compra #${orderId || '--'}`);
};

export const resolvePurchaseOrderDate = order =>
  normalizeText(
    order?.orderDate ||
      order?.alterDate ||
      order?.order_date ||
      order?.alter_date ||
      '',
  );

export const resolvePurchaseOrderDocument = order =>
  normalizeText(order?.documentNumber || order?.document_number || order?.invoiceNumber || '');

export const resolvePurchaseOrderLineLabel = line =>
  normalizeText(
    line?.product?.product ||
      line?.product?.name ||
      line?.productName ||
      line?.name ||
      line?.description ||
      'Item comprado',
  );

export const resolvePurchaseOrderLineUnit = line =>
  normalizeText(
    line?.unit ||
      line?.product?.erpUnit ||
      line?.product?.baseUnit ||
      line?.product?.unit ||
      'un',
  );

export const resolvePurchaseOrderLineQuantity = line => toNumber(line?.quantity);

export const resolvePurchaseOrderLineUnitPrice = line =>
  toNumber(line?.unitPrice || line?.price || line?.value || 0);

export const resolvePurchaseOrderLineTotal = line => {
  const explicitTotal = toNumber(line?.total);
  if (explicitTotal > 0) return explicitTotal;

  const quantity = resolvePurchaseOrderLineQuantity(line);
  const unitPrice = resolvePurchaseOrderLineUnitPrice(line);
  return resolveOrderProductTotal({
    ...line,
    quantity,
    unitPrice,
  });
};

export const resolveOrderAttachmentLabel = relation =>
  normalizeText(
    relation?.file?.fileName ||
      relation?.file?.name ||
      relation?.file?.originalName ||
      relation?.file?.title ||
      relation?.file?.filename ||
      relation?.file?.path ||
      relation?.file?.url ||
      `Arquivo ${normalizeEntityId(relation?.file || relation) || '--'}`,
  );

export const resolveOrderAttachmentKind = relation => {
  const file = relation?.file || relation || {};
  const fileType = normalizeText(file?.fileType || file?.mimeType || file?.type);
  const extension = normalizeText(file?.extension || '').toLowerCase();

  if (fileType && extension) return `${fileType}/${extension}`;
  if (fileType) return fileType;
  if (extension) return extension;
  return 'arquivo';
};

export const countOrderAttachments = relations => normalizeCollection(relations).length;

export const buildPurchaseHistoryLoadedKey = ({
  companyId,
  searchText = '',
  pageSize = PURCHASE_HISTORY_PAGE_SIZE,
  orderField = 'id',
  orderDirection = 'desc',
} = {}) =>
  [
    normalizeEntityId(companyId) || 'no-company',
    'purchase-history',
    normalizeSearch(searchText),
    pageSize,
    orderField,
    orderDirection,
  ].join('|');

export const buildPurchaseHistoryQuery = ({
  companyId,
  searchText = '',
  page = 1,
  pageSize = PURCHASE_HISTORY_PAGE_SIZE,
  orderField = 'id',
  orderDirection = 'desc',
} = {}) => {
  const normalizedCompanyId = normalizeEntityId(companyId);

  if (!normalizedCompanyId) {
    return null;
  }

  const query = {
    provider: `/people/${normalizedCompanyId}`,
    orderType: 'purchase',
    itemsPerPage: pageSize,
    page,
    [`order[${orderField}]`]: orderDirection,
  };

  const normalizedSearch = normalizeText(searchText).replace(/^#/, '');
  if (normalizedSearch) {
    query.search = normalizedSearch;
  }

  return query;
};

