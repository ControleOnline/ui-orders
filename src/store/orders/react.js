import { useState } from 'react';
import storeModule from './index';

export const orders = () => {
  const [state, setState] = useState(storeModule.state);
  const commit = (type, payload) => {
    const mutation = storeModule.mutations[type];
    if (mutation) {
      const newState = { ...state };
      mutation(newState, payload);
      setState(newState);
    }
  };

  return {
    state,
    actions: storeModule.actions,
    commit,
  };
};