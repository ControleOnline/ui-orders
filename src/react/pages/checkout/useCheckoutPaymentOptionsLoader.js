import {useCallback, useEffect} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {api} from '@controleonline/ui-common/src/api';
import {
  filterDeviceConfigsByCompany,
  filterWalletPaymentTypesByAllowedIds,
  getPaymentGateway,
  resolveDevicePaymentTypeIds,
  selectPosWalletPaymentTypes,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {isGatewayFreePayment} from '@controleonline/ui-common/src/react/utils/cashPayment';
import {isIntegratedPaymentOption} from '@controleonline/ui-common/src/react/utils/paymentOptions';
import {normalizeGatewayPaymentError} from '@controleonline/ui-common/src/react/services/paymentGatewayExecution';
import {extractCollectionItems} from '@controleonline/ui-orders/src/react/utils/posCartHelpers';
import {buildPaymentSelectionOption} from './CheckoutPaymentOptions';
import {
  PAYMENT_CHANNEL_LOCAL,
  PAYMENT_CHANNEL_REMOTE,
} from './checkoutStatusHelpers';

export default function useCheckoutPaymentOptionsLoader({
  allPaymentOptions,
  canChangePaymentDeviceDuringCheckout,
  canUseLocalOperationalPayment,
  canUseRemoteOperationalPayment = true,
  waiterConsultationCheckout = false,
  isLocalPaymentDevice = true,
  currentCompany,
  device,
  deviceConfigActions,
  isLocalCieloPdv,
  remotePaymentDevices,
  selectedRemoteDevice,
  setCompanyDeviceConfigs,
  setLoadingPaymentOptions,
  setLocalPaymentOptions,
  setPaymentOptionsError,
  setRemotePaymentOptions,
  setSelectedPaymentOption,
  setSelectedRemoteDeviceId,
}) {
  useFocusEffect(
    useCallback(() => {
      if (!currentCompany?.id || (isLocalCieloPdv && !waiterConsultationCheckout)) {
        setCompanyDeviceConfigs([]);
        return;
      }

      const loadConfigs = waiterConsultationCheckout
        ? deviceConfigActions.ensureCompanyDeviceConfigsLoaded
        : deviceConfigActions.getItems;
      loadConfigs({people: '/people/' + currentCompany.id})
        .then(data => {
          setCompanyDeviceConfigs(
            filterDeviceConfigsByCompany(data, currentCompany?.id),
          );
        })
        .catch(() => setCompanyDeviceConfigs([]));
    }, [currentCompany?.id, deviceConfigActions, isLocalCieloPdv, waiterConsultationCheckout]),
  );

  useEffect(() => {
    if (!remotePaymentDevices.length) {
      setSelectedRemoteDeviceId('');
      return;
    }

    const defaultDeviceId = remotePaymentDevices[0].deviceId;
    setSelectedRemoteDeviceId(current =>
      !canChangePaymentDeviceDuringCheckout
        ? defaultDeviceId
        : remotePaymentDevices.some(device => device.deviceId === current)
          ? current
          : defaultDeviceId,
    );
  }, [
    canChangePaymentDeviceDuringCheckout,
    remotePaymentDevices,
    setSelectedRemoteDeviceId,
  ]);

  useEffect(() => {
    let isMounted = true;

    const loadPaymentOptions = async () => {
      if (!currentCompany?.id) {
        setLoadingPaymentOptions(false);
        setLocalPaymentOptions([]);
        setRemotePaymentOptions([]);
        setPaymentOptionsError('');
        return;
      }

      if (waiterConsultationCheckout && !canUseLocalOperationalPayment &&
        (!canUseRemoteOperationalPayment || !selectedRemoteDevice)) {
        setLoadingPaymentOptions(false);
        setLocalPaymentOptions([]);
        setRemotePaymentOptions([]);
        setPaymentOptionsError(canUseRemoteOperationalPayment
          ? 'Configure um device de pagamento remoto autorizado para receber esta comanda.'
          : 'Cobrança não autorizada neste device. Volte à consulta para atualizar.');
        return;
      }

      const localPaymentTypeIds = canUseLocalOperationalPayment
        ? resolveDevicePaymentTypeIds(device?.configs)
        : [];
      const remotePaymentTypeIds = canUseRemoteOperationalPayment && selectedRemoteDevice?.config
        ? resolveDevicePaymentTypeIds(selectedRemoteDevice.config?.configs)
        : [];

      const posGateway = getPaymentGateway(device) || getPaymentGateway(selectedRemoteDevice?.config);
      if (!localPaymentTypeIds.length && !remotePaymentTypeIds.length && !posGateway) {
        setLoadingPaymentOptions(false);
        setLocalPaymentOptions([]);
        setRemotePaymentOptions([]);
        setPaymentOptionsError('');
        return;
      }

      setLoadingPaymentOptions(true);
      setPaymentOptionsError('');

      try {
        try {
          await api.fetch('configs/discovery-configs', {
            method: 'POST',
            body: {people: '/people/' + currentCompany.id},
          });
        } catch (discoveryError) {
          if (!isMounted) return;
          setLocalPaymentOptions([]);
          setRemotePaymentOptions([]);
          setPaymentOptionsError(
            normalizeGatewayPaymentError(
              discoveryError,
              'Nao foi possivel descobrir as configuracoes de pagamento.',
            ),
          );
          return;
        }

        const response = await api.fetch('wallet_payment_types', {
          params: {people: '/people/' + currentCompany.id},
        });
        if (!isMounted) return;
        const receivedPaymentTypes = extractCollectionItems(response);
        const allPaymentTypes = selectPosWalletPaymentTypes({
          walletPaymentTypes: receivedPaymentTypes,
          deviceConfigs: device?.configs,
          companyConfigs: selectedRemoteDevice?.config?.configs,
          gateway: getPaymentGateway(device) || getPaymentGateway(selectedRemoteDevice?.config),
        });
        const localCatalog = waiterConsultationCheckout ? selectPosWalletPaymentTypes({
          walletPaymentTypes: receivedPaymentTypes, deviceConfigs: device?.configs,
          companyConfigs: currentCompany?.configs, gateway: getPaymentGateway(device),
        }) : allPaymentTypes;
        const remoteCatalog = waiterConsultationCheckout ? selectPosWalletPaymentTypes({
          walletPaymentTypes: receivedPaymentTypes, deviceConfigs: selectedRemoteDevice?.config?.configs,
          companyConfigs: currentCompany?.configs, gateway: getPaymentGateway(selectedRemoteDevice?.config),
        }) : allPaymentTypes;
        const localTypes = localPaymentTypeIds.length
          ? filterWalletPaymentTypesByAllowedIds(
              localCatalog,
              localPaymentTypeIds,
            )
          : localCatalog;
        const remoteTypes = remotePaymentTypeIds.length
          ? filterWalletPaymentTypesByAllowedIds(
              remoteCatalog,
              remotePaymentTypeIds,
            )
          : remoteCatalog;
        setLocalPaymentOptions(
          (waiterConsultationCheckout ? localTypes.filter(payment => canUseLocalOperationalPayment && (isLocalPaymentDevice || isGatewayFreePayment(payment))) : localTypes).map(payment =>
            buildPaymentSelectionOption({
              channel: PAYMENT_CHANNEL_LOCAL,
              payment,
            }),
          ),
        );
        setRemotePaymentOptions(
          remoteTypes
            .filter(payment => canUseRemoteOperationalPayment && !!selectedRemoteDevice && isIntegratedPaymentOption(payment))
            .map(payment =>
              buildPaymentSelectionOption({
                channel: PAYMENT_CHANNEL_REMOTE,
                payment,
                targetDeviceId: selectedRemoteDevice?.deviceId,
                targetDeviceLabel: selectedRemoteDevice?.alias || 'Device principal',
              }),
            ),
        );
      } catch (error) {
        if (!isMounted) return;
        setLocalPaymentOptions([]);
        setRemotePaymentOptions([]);
        setPaymentOptionsError(
          normalizeGatewayPaymentError(
            error,
            'Nao foi possivel carregar os meios de pagamento.',
          ),
        );
      } finally {
        if (isMounted) setLoadingPaymentOptions(false);
      }
    };

    loadPaymentOptions();
    return () => {
      isMounted = false;
    };
  }, [
    canUseLocalOperationalPayment,
    canUseRemoteOperationalPayment,
    waiterConsultationCheckout,
    isLocalPaymentDevice,
    currentCompany?.id,
    currentCompany?.configs,
    device?.configs,
    selectedRemoteDevice?.alias,
    selectedRemoteDevice?.config?.configs,
    selectedRemoteDevice?.deviceId,
  ]);

  useEffect(() => {
    setSelectedPaymentOption(current => {
      const currentKey = current?.key || '';
      if (!allPaymentOptions.length) return null;
      return (
        allPaymentOptions.find(option => option.key === currentKey) ||
        allPaymentOptions[0]
      );
    });
  }, [allPaymentOptions, setSelectedPaymentOption]);
}
