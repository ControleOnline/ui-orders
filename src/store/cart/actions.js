import {api} from '@controleonline/ui-common/src/api';
import * as types from '@controleonline/ui-default/src/store/default/mutation_types';

export const discoveryCart = ({commit}, params = {}) => {
  commit(types.SET_ISLOADING, true);
  return api
    .fetch('cart', {params: params})
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
