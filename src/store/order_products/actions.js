import {api} from '@controleonline/ui-common/src/api';
import {
  remove as defaultRemove,
  save as defaultSave,
} from '@controleonline/ui-default/src/store/default/actions';
import {queue} from '@controleonline/ui-common/src/api/queue';

const normalizeId = value =>
  String(value?.id || value?.['@id'] || value || '')
    .replace(/\D+/g, '')
    .trim();

const normalizeItems = response => {
  if (Array.isArray(response)) return response.filter(Boolean);
  if (Array.isArray(response?.member)) return response.member.filter(Boolean);
  if (Array.isArray(response?.['hydra:member'])) {
    return response['hydra:member'].filter(Boolean);
  }

  return [];
};

const normalizeFilterIri = value => String(value || '').replace(/^\/+/, '');

const findExistingOrderProduct = async ({getters}, {order, product}) => {
  if (!order || !product) {
    return null;
  }

  const response = await api.fetch(getters.resourceEndpoint, {
    params: {
      order: normalizeFilterIri(order),
      product: normalizeFilterIri(product),
      itemsPerPage: 1,
    },
  });

  return normalizeItems(response)[0] || null;
};

const persistAnonymousQuantity = async (params = {}) => {
  const provider = normalizeId(params.provider);
  const product = normalizeId(params.product);
  const externalCode = params.externalCode || null;

  if (!provider || !product || !externalCode) {
    return null;
  }

  return api.fetch('anonymous-cart/items', {
    method: 'POST',
    body: {
      provider,
      product,
      quantity: Math.max(0, Number(params.quantity || 0)),
      externalCode,
    },
  });
};

const persistQuantity = async (context, params = {}) => {
  if (params.anonymous) {
    return persistAnonymousQuantity(params);
  }

  const {
    id,
    order,
    parentProduct = null,
    product,
    product_group_id = null,
    quantity,
  } = params;
  const nextQuantity = Math.max(0, Number(quantity || 0));
  const existingId = normalizeId(id);
  const existing =
    existingId || !order || !product
      ? null
      : await findExistingOrderProduct(context, {order, product});
  const targetId = existingId || normalizeId(existing);

  if (nextQuantity <= 0) {
    if (!targetId) {
      return null;
    }

    await defaultRemove(context, targetId);
    return null;
  }

  return defaultSave(context, {
    id: targetId || null,
    parentProduct,
    product,
    product_group_id,
    quantity: nextQuantity,
    order,
  });
};

export const saveQuantityQueued = (context, params = {}) =>
  new Promise((resolve, reject) => {
    queue.executeQueue(
      () =>
        persistQuantity(context, params)
          .then(result => {
            resolve(result);
            return result;
          })
          .catch(error => {
            reject(error);
            throw error;
          }),
    );
  });
