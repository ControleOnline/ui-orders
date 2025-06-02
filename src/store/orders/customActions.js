import {api} from '@controleonline/ui-common/src/api';
import * as types from '@controleonline/ui-default/src/store/default/mutation_types';

export const addProducts = ({commit, getters}, order, products) => {
  let options = {
    method: 'PUT',
    body: products,
  };
  commit(types.SET_ISSAVING, true);

  return api
    .fetch(getters.resourceEndpoint + '/' + order + '/add-products', options)
    .then(data => {
      delete data['@context'];
      commit(types.SET_ITEM, data);
      return data;
    })
    .catch(e => {
      commit(types.SET_ERROR, e.message);
      throw e;
    })
    .finally(() => {
      commit(types.SET_ISSAVING, false);
    });
};
