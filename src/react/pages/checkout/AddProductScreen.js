import React, {useCallback, useState} from 'react';
import {useStore} from '@store';
import {useFocusEffect, useRoute} from '@react-navigation/native';

import {api} from '@controleonline/ui-common/src/api';
import Categories from '@controleonline/ui-products/src/react/pages/Categories';
import TotemProducts from '@controleonline/ui-orders/src/react/pages/checkout/TotemProducts';
import {env} from '@env';

const normalizeStatusKey = value => String(value || '').trim().toLowerCase();

const extractCollectionItems = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.member)) return response.member;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  return [];
};

const buildStatusIriFromId = value => {
  const normalizedId = String(value || '').replace(/\D/g, '');
  return normalizedId ? `/statuses/${normalizedId}` : null;
};

let posOpenOrderStatusIriCache = null;

const resolvePosOpenOrderStatusIri = async fallbackStatusId => {
  if (posOpenOrderStatusIriCache) return posOpenOrderStatusIriCache;

  const fallbackIri = buildStatusIriFromId(fallbackStatusId);

  try {
    const response = await api.fetch('statuses', {
      params: {
        context: 'order',
        realStatus: 'open',
        status: 'open',
        itemsPerPage: 10,
      },
    });
    const items = extractCollectionItems(response);
    const matchedStatus =
      items.find(
        item =>
          normalizeStatusKey(item?.realStatus) === 'open' &&
          normalizeStatusKey(item?.status) === 'open',
      ) || items[0];
    const resolvedIri =
      matchedStatus?.['@id'] || buildStatusIriFromId(matchedStatus?.id) || fallbackIri;

    if (resolvedIri) {
      posOpenOrderStatusIriCache = resolvedIri;
    }

    return resolvedIri;
  } catch (error) {
    return fallbackIri;
  }
};

const isOpenPosCartOrder = order =>
  String(order?.app || '').trim().toUpperCase() === 'POS' &&
  normalizeStatusKey(order?.status?.realStatus) === 'open' &&
  normalizeStatusKey(order?.status?.status) === 'open';

const CheckoutContent = ({navigation}) => {
  const route = useRoute();
  const ordersStore = useStore('orders');
  const peopleStore = useStore('people');
  const deviceStore = useStore('device');
  const ordersActions = ordersStore.actions;
  const ordersGetters = ordersStore.getters;
  const peopleGetters = peopleStore.getters;
  const {currentCompany, defaultCompany, isLoading, error} = peopleGetters;
  const deviceGetters = deviceStore.getters;
  const {item: storagedDevice} = deviceGetters;
  const {item: order, items: orders} = ordersGetters;

  const configuredStatus = defaultCompany?.configs['pos-default-status'];
  const [forceCreate, setForceCreate] = useState(
    route.params?.forceCreate || false,
  );

  const Component = env.APP_TYPE === 'TOTEM' ? TotemProducts : Categories;

  useFocusEffect(
    useCallback(() => {
      return () => {
        ordersActions.initQueue();
      };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (forceCreate) {
        setForceCreate(false);
        resolvePosOpenOrderStatusIri(configuredStatus).then(statusIri => {
          if (!statusIri || !currentCompany?.id) {
            return;
          }

          const payload = {
            app: 'POS',
            provider: '/people/' + currentCompany.id,
            status: statusIri,
            orderType: 'sale',
          };

          if (storagedDevice?.id) {
            payload['device.device'] = storagedDevice.id;
          }

          ordersActions.save(payload).then(data => {
            ordersActions.setItem(data);
          });
        });
      }
    }, [configuredStatus, currentCompany?.id, forceCreate, ordersActions, storagedDevice?.id]),
  );
  useFocusEffect(
    useCallback(() => {
      // Cria nova order sempre que não há uma ativa no PDV,
      // independente de existirem outros pedidos na lista de histórico
      if (currentCompany && !isOpenPosCartOrder(order)) setForceCreate(true);
    }, [currentCompany, order]),
  );

  return <Component />;
};

export default CheckoutContent;
