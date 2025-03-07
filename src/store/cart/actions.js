import { api } from "@controleonline/ui-common/src/api";
import * as types from "./mutation_types";

export const discoveryCard = ({ commit, getters }, params = {}) => {
  commit(types.SET_ISLOADING, true);
  return api
    .fetch("cart", { params: params })

    .then((data) => {
      commit(types.SET_ORDER, data);
      return result;
    })
    .catch((e) => {
      commit(types.SET_ERROR, e.message);
      throw e;
    })
    .finally((e) => {
      commit(types.SET_ISLOADING, false);
    });
};

export const setError = ({ commit }, error = null) => {
  commit(types.SET_ERROR, error);
};

export const setIsLoading = ({ commit }, isLoading = true) => {
  commit(types.SET_ISLOADING, isLoading);
};

export const setIsSaving = ({ commit }, isSaving = true) => {
  commit(types.SET_ISSAVING, isSaving);
};

export const setViolations = ({ commit }, violations = null) => {
  commit(types.SET_VIOLATIONS, violations);
};

export const setOrder = ({ commit }, order = null) => {
  commit(types.SET_ORDER, order);
};

export const setCustomProducts = ({ commit }, customProducts = []) => {
  commit(types.SET_CUSTOM_PRODUCTS, customProducts);
};

export const setProduct = ({ commit }, product = []) => {
  commit(types.SET_PRODUCT, product);
};

export const setReload = ({ commit }, reload = false) => {
  commit(types.SET_RELOAD, reload);
};
