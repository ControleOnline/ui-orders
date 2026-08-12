import {useMemo} from 'react';
import {Platform} from 'react-native';
import {app_type} from '@appType';
import {
  getPaymentGatewayFromConfigs,
  isOrderPaymentDeviceChangeAllowed,
  resolveRemotePaymentDeviceOptions,
  supportsLocalCardPayment,
  PAYMENT_GATEWAY_CIELO,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {
  isPosAutoPrintEnabled,
  isPosCounterMode,
  isPosSelfServiceMode,
  isPosSingleItemMode,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  getOrderRouteId,
  isPdvRouteContext,
} from '@controleonline/ui-orders/src/react/utils/orderRoute';
import {
  isLoyaltyCouponsEnabledForCheckout,
  resolveCheckoutCompanyConfigs,
} from '@controleonline/ui-orders/src/react/utils/checkoutLoyaltyCpf';
import {IS_WEB_PLATFORM} from './checkoutStatusHelpers';

export default function useCheckoutContextState({
  companyConfigs,
  companyDeviceConfigs,
  currentCompany,
  defaultCompany,
  device,
  order,
  route,
  selectedRemoteDeviceId,
  storeStatus,
}) {
  const routeOrderId = useMemo(
    () => getOrderRouteId(route.params?.id || route.params?.order),
    [route.params?.id, route.params?.order],
  );
  const effectiveCompanyConfigs = useMemo(
    () =>
      resolveCheckoutCompanyConfigs({
        companyConfigs,
        currentCompanyConfigs: currentCompany?.configs,
        defaultCompanyConfigs: defaultCompany?.configs,
      }),
    [companyConfigs, currentCompany?.configs, defaultCompany?.configs],
  );
  const localGateway = useMemo(() => getPaymentGatewayFromConfigs(device), [device]);
  const deviceType = useMemo(
    () => String(device?.type || device?.device?.type || '').trim().toUpperCase(),
    [device?.device?.type, device?.type],
  );
  const isManagerApp = useMemo(
    () => String(app_type || '').trim().toUpperCase() === 'MANAGER',
    [],
  );
  const isPosApp = useMemo(
    () => String(app_type || '').trim().toUpperCase() === 'POS',
    [],
  );
  const isLocalPaymentDevice = useMemo(
    () => supportsLocalCardPayment({deviceConfig: device, platform: Platform.OS}),
    [device],
  );
  const isLocalCieloPdv =
    !isManagerApp &&
    !IS_WEB_PLATFORM &&
    deviceType === 'PDV' &&
    localGateway === PAYMENT_GATEWAY_CIELO;
  const isPdvInteractionMode = useMemo(
    () => isPdvRouteContext(route?.params),
    [route?.params],
  );
  const isSelfServiceMode = useMemo(
    () => isPosSelfServiceMode(device?.configs),
    [device?.configs],
  );
  const isCounterMode = useMemo(
    () => isPosCounterMode(device?.configs),
    [device?.configs],
  );
  const isSingleItemMode = useMemo(
    () => route?.params?.singleItemMode === true || isPosSingleItemMode(device?.configs),
    [device?.configs, route?.params?.singleItemMode],
  );
  const isAutoPrintEnabled = useMemo(
    () => isPosAutoPrintEnabled(device?.configs),
    [device?.configs],
  );
  const checkoutOrderId = routeOrderId || getOrderRouteId(order);
  const canUseLocalOperationalPayment = useMemo(
    () =>
      !isManagerApp &&
      (isLocalPaymentDevice || deviceType === 'PDV' || isPdvInteractionMode),
    [deviceType, isLocalPaymentDevice, isManagerApp, isPdvInteractionMode],
  );
  const requiresLoyaltyCpfStep = useMemo(
    () =>
      isLoyaltyCouponsEnabledForCheckout(effectiveCompanyConfigs) &&
      (isPosApp || deviceType === 'PDV' || isPdvInteractionMode),
    [deviceType, effectiveCompanyConfigs, isPdvInteractionMode, isPosApp],
  );
  const canChangePaymentDeviceDuringCheckout = useMemo(
    () => isOrderPaymentDeviceChangeAllowed(effectiveCompanyConfigs),
    [effectiveCompanyConfigs],
  );
  const remotePaymentDevices = useMemo(
    () =>
      resolveRemotePaymentDeviceOptions({
        deviceConfig: device,
        deviceConfigs: companyDeviceConfigs,
        companyConfigs: effectiveCompanyConfigs,
      }),
    [companyDeviceConfigs, device, effectiveCompanyConfigs],
  );
  const selectedRemoteDevice = useMemo(
    () =>
      remotePaymentDevices.find(item => item.deviceId === selectedRemoteDeviceId) ||
      remotePaymentDevices[0] ||
      null,
    [remotePaymentDevices, selectedRemoteDeviceId],
  );
  const canRenderCheckout =
    !storeStatus?.ordersGetters?.isLoading &&
    !storeStatus?.ordersGetters?.isSaving &&
    !storeStatus?.invoiceGetters?.isLoading &&
    !storeStatus?.invoiceGetters?.isSaving &&
    !storeStatus?.orderProductsGetters?.isLoading &&
    !storeStatus?.orderProductsGetters?.isSaving;
  return {
    canChangePaymentDeviceDuringCheckout,
    canRenderCheckout,
    canUseLocalOperationalPayment,
    checkoutOrderId,
    effectiveCompanyConfigs,
    isAutoPrintEnabled,
    isCounterMode,
    isLocalCieloPdv,
    isPdvInteractionMode,
    isSelfServiceMode,
    isSingleItemMode,
    localGateway,
    remotePaymentDevices,
    requiresLoyaltyCpfStep,
    routeOrderId,
    selectedRemoteDevice,
  };
}
