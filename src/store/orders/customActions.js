import {api} from '@controleonline/ui-common/src/api';
import * as types from '@controleonline/ui-default/src/store/default/mutation_types';

export function print({commit}, params = {}) {
  commit(types.SET_ISLOADING);

  const options = {
    method: 'POST',
    body: params,
  };

  return api
    .fetch('/orders/' + params.id + '/print', options)

    .then(data => {
      commit(types.SET_ISLOADING, false);

      return data;
    })
    .catch(e => {
      commit(types.SET_ISLOADING, false);

      commit(types.SET_ERROR, e.message);
      throw e;
    });
}
