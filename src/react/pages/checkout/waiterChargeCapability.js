import {app_type} from '@appType';
import {isOrderChargeEnabled, parseConfigsObject} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {isWaiterTabHome} from '../home/waiterTabHomeActions';
import {normalizeEntityId} from '../../utils/linkedOrderContext';

export {getWaiterChargeChannels} from './tabConsultationCharge';
export const isWaiterConsultationCheckout = (route, configs) => {
  const rootId = normalizeEntityId(route?.params?.waiterTabConsultationRootId);
  return !!rootId && rootId === normalizeEntityId(route?.params?.id) && isWaiterTabHome(app_type, configs);
};

// Filter unsuitable receivers for this new flow only. Invoice writes still use API authorization.
export const filterWaiterPaymentReceivers = configs => {
  const rows = Array.isArray(configs) ? configs : [];
  const deviceId = row => String(row?.device?.device || row?.deviceId || row?.device || '').trim();
  return rows.filter(row => {
    const sameDevice = rows.filter(other => deviceId(other) === deviceId(row));
    return String(row?.type).toUpperCase() === 'PDV' && isOrderChargeEnabled(row?.configs) &&
      !sameDevice.some(other => String(other?.type).toUpperCase() === 'MANAGER' ||
        Object.prototype.hasOwnProperty.call(parseConfigsObject(other?.configs), 'order-charge-enabled') && !isOrderChargeEnabled(other?.configs));
  });
};
