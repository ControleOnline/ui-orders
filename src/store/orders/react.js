import {useState} from 'react';
import storeModule from './index';

export const ordersStore = () => {
  const [state] = useState(storeModule.state);
  const commit = (type, payload) => {};
  return {
    getters: state,
    actions: storeModule.actions,
    commit,
  };
};
