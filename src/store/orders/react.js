import {useState} from 'react';
import storeModule from './index';


export const ordersStore = () => {
  const [state, setState] = useState(storeModule.state);
  const actions = {};
  const getters = state;

  const commit = (type, payload) => {
    const name = storeModule.mutations[type](state, payload);
    const newState = {...state};
    newState[name] = payload;
    setState(newState);
  };
  Object.keys(storeModule.actions).forEach(actionName => {
    actions[actionName] = (...args) =>
      storeModule.actions[actionName]({commit, getters}, ...args);
  });

  return {
    getters,
    actions,
  };
};
