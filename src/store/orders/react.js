import {useState} from 'react';
import storeModule from './index';

export const ordersStore = () => {
  const [state, setState] = useState(storeModule.state);
  const commit = (type, payload) => {
    const mutation = storeModule.mutations[type](state, payload);
    if (mutation) {
      const newState = {...state};
      mutation(newState, payload);
      setState(newState);
    }
  };
  return {
    getters: state,
    actions: storeModule.actions,
    commit,
  };
};
