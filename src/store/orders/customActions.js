import {api} from '@controleonline/ui-common/src/api';
import * as types from '@controleonline/ui-default/src/store/default/mutation_types';
import {
  mergeOrderIntoList,
  mergeOrderWithOrderProducts,
  normalizeEntityId,
} from '@controleonline/ui-orders/src/utils/orderState';

const extractCollectionItems = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.member)) return response.member;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  return [];
};

const resolveTotalItems = (response, items) =>
  Number(response?.totalItems || response?.['hydra:totalItems'] || items?.length || 0);

const appendOrdersPage = (currentItems, pageItems) => {
  const nextItems = Array.isArray(currentItems) ? [...currentItems] : [];

  (Array.isArray(pageItems) ? pageItems : []).forEach(order => {
    const orderId = normalizeEntityId(order);
    const existingIndex = nextItems.findIndex(item => normalizeEntityId(item) === orderId);

    if (existingIndex >= 0) {
      nextItems[existingIndex] = order;
      return;
    }

    nextItems.push(order);
  });

  return nextItems;
};

const commitSyncedOrder = ({commit, getters}, order, options = {}) => {
  if (!order || typeof order !== 'object') {
    return order;
  }

  delete order['@context'];
  commit(types.SET_ITEM, order);

  if (Array.isArray(getters.items)) {
    commit(
      types.SET_ITEMS,
      mergeOrderIntoList(getters.items, order, {
        prependIfMissing: options.prependIfMissing && getters.items.length > 0,
      }),
    );
  }

  return order;
};

export const fetchHistoryPage = ({commit, getters}, {query = {}, append = false, loadedKey = ''} = {}) => {
  commit(types.SET_ISLOADINGLIST, true);
  commit(types.SET_ERROR, null);

  return api
    .fetch(getters.resourceEndpoint, {params: query})
    .then(response => {
      commit(types.SET_ERROR, null);
      const pageItems = extractCollectionItems(response);
      const nextItems = append ? appendOrdersPage(getters.items, pageItems) : pageItems;

      commit(types.SET_ITEMS, nextItems);
      commit(types.SET_TOTALITEMS, resolveTotalItems(response, nextItems));
      commit(types.SET_SUMMARY, response?.summary || {});
      commit(types.SET_LOADED_KEY, loadedKey || '');
      commit(types.SET_LOADED_AT, Date.now());

      return {
        items: pageItems,
        mergedItems: nextItems,
        totalItems: resolveTotalItems(response, nextItems),
        summary: response?.summary || {},
      };
    })
    .catch(e => {
      commit(types.SET_ERROR, e.message);
      throw e;
    })
    .finally(() => {
      commit(types.SET_ISLOADINGLIST, false);
    });
};

export const syncOrder = ({commit, getters}, order) =>
  commitSyncedOrder({commit, getters}, order, {prependIfMissing: true});

export const syncOrderProducts = ({commit, getters}, {orderId, orderProducts = []} = {}) => {
  const targetOrderId = normalizeEntityId(orderId || getters.item);

  if (!targetOrderId) {
    return null;
  }

  let nextCurrentItem = getters.item;
  if (normalizeEntityId(getters.item) === targetOrderId) {
    nextCurrentItem = mergeOrderWithOrderProducts(getters.item, orderProducts);
    commit(types.SET_ITEM, nextCurrentItem);
  }

  if (Array.isArray(getters.items)) {
    const nextItems = getters.items.map(order =>
      normalizeEntityId(order) === targetOrderId
        ? mergeOrderWithOrderProducts(order, orderProducts)
        : order,
    );
    commit(types.SET_ITEMS, nextItems);
  }

  return nextCurrentItem;
};

export const addProducts = ({commit, getters}, order, products) => {
  let options = {
    method: 'PUT',
    body: products,
  };
  commit(types.SET_ISSAVING, true);
  commit(types.SET_ERROR, null);

  return api
    .fetch(getters.resourceEndpoint + '/' + order + '/add-products', options)
    .then(data => {
      commit(types.SET_ERROR, null);
      return commitSyncedOrder({commit, getters}, data, {
        prependIfMissing: true,
      });
    })
    .catch(e => {
      commit(types.SET_ERROR, e.message);
      throw e;
    })
    .finally(() => {
      commit(types.SET_ISSAVING, false);
    });
};

export const requestConferenceAutoPrint = ({commit, getters}, params = {}) => {
  const orderId = normalizeEntityId(params?.id);
  if (!orderId) {
    return Promise.reject(new Error('Order not informed'));
  }

  commit(types.SET_ERROR, null);

  return api
    .fetch(`${getters.resourceEndpoint}/${orderId}/conference-print`, {
      method: 'POST',
      body: {
        ...params,
        id: orderId,
      },
    })
    .then(data => {
      commit(types.SET_ERROR, null);

      if (data?.order && typeof data.order === 'object') {
        commitSyncedOrder({commit, getters}, data.order, {
          prependIfMissing: true,
        });
      }

      return data;
    })
    .catch(e => {
      commit(types.SET_ERROR, e.message);
      throw e;
    });
};
