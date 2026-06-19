import {api} from '@controleonline/ui-common/src/api';
import * as types from '@controleonline/ui-default/src/store/default/mutation_types';

export const discoveryCart = ({commit}, params = {}) => {
  commit(types.SET_ISLOADING, true);
  const nextParams = {
    ...params,
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
export const setCustomProducts = ({ commit }, customProducts = []) => {
  commit('SET_CUSTOM_PRODUCTS', customProducts);
};

export const setProduct = ({ commit }, product = []) => {
  commit('SET_PRODUCT', product);
};
