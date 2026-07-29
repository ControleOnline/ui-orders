import {api} from '@controleonline/ui-common/src/api';
import * as types from '@controleonline/ui-default/src/store/default/mutation_types';

export const discoveryCart = ({commit}, params = {}) => {
  commit(types.SET_ISLOADING, true);
  const nextParams = {
    ...params,
    // O POS sempre nasce como cart; sale so aparece depois da promocao do pedido.
    orderType: 'cart',
  };

  return api
    .fetch('cart', {params: nextParams})
    .then(data => {
      commit(types.SET_ITEM, data);
      return data;
    })
    .catch(e => {
      commit(types.SET_ERROR, e.message);
      throw e;
    })
    .finally(e => {
      commit(types.SET_ISLOADING, false);
    });
};

export const discoveryAnonymousCart = ({commit}, params = {}) => {
  commit(types.SET_ISLOADING, true);

  const provider = params.provider || params.company || null;
  const externalCode = params.externalCode || null;

  return api
    .fetch('anonymous-cart', {
      params: {
        provider,
        ...(externalCode ? {externalCode} : {}),
      },
    })
    .then(data => {
      const cart = {...(data || {}), anonymous: true};
      commit(types.SET_ITEM, cart);
      return cart;
    })
    .catch(e => {
      commit(types.SET_ERROR, e.message);
      throw e;
    })
    .finally(() => {
      commit(types.SET_ISLOADING, false);
    });
};
export const setCustomProducts = ({ commit }, customProducts = []) => {
  commit('SET_CUSTOM_PRODUCTS', customProducts);
};

export const setProduct = ({ commit }, product = []) => {
  commit('SET_PRODUCT', product);
};
