import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '@store';
import {api} from '@controleonline/ui-common/src/api';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import {
  formatHumanLabel,
  normalizeText,
} from '@controleonline/ui-common/src/react/utils/entityDisplay';
import OrderStackedTopBar from '@controleonline/ui-orders/src/react/pages/orders/sales/components/OrderStackedTopBar';
import useOrderDetailsVisuals from './useOrderDetailsVisuals';
import createStyles from './orderLogisticsPage.styles';
import {resolveOrderLogisticsSnapshot} from './orderLogisticsPresentation';

const normalizeOrderId = value =>
  String(value ?? '')
    .replace(/\D+/g, '')
    .trim();

const resolvePreferredText = (...values) => {
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) return normalized;
  }

  return '';
};

const normalizeActionResult = response => {
  if (Array.isArray(response?.member)) {
    return response.member[0] || null;
  }

  if (response?.result && typeof response.result === 'object') {
    return response.result;
  }

  return response || null;
};

const formatApiError = error => {
  if (!error) return 'Nao foi possivel concluir a solicitacao.';
  if (typeof error === 'string') return error;
  if (Array.isArray(error?.message)) {
    return error.message
      .map(item => item?.message || item?.title || String(item))
      .filter(Boolean)
      .join('\n');
  }

  return (
    error?.message ||
    error?.description ||
    error?.errmsg ||
    'Nao foi possivel concluir a solicitacao.'
  );
};

const renderAddressLines = parts => {
  if (!parts) {
    return [
      'Endereco nao informado.',
    ];
  }

  const primary = normalizeText(parts.primary || parts.streetLine || parts.nickname);
  const secondary = normalizeText(
    [parts.district, parts.cityStateLine, parts.postalCode]
      .filter(Boolean)
      .join(' • '),
  );
  const complement = normalizeText(parts.complement);

  return [primary, secondary, complement].filter(Boolean);
};

const renderContactLines = contact => {
  if (!contact) {
    return ['Contato nao informado.'];
  }

  const lines = [
    normalizeText(contact.name),
    normalizeText(contact.phone),
    normalizeText(contact.email),
  ];

  return lines.filter(Boolean).length ? lines.filter(Boolean) : ['Contato nao informado.'];
};

const renderSection = (title, lines, styles) => (
  <View style={styles.detailsSection}>
    <Text style={styles.detailsSectionTitle}>{title}</Text>
    {lines.map(line => (
      <Text key={`${title}-${line}`} style={styles.detailsInfoText}>
        {line}
      </Text>
    ))}
  </View>
);

const OrderLogisticsPage = ({navigation, route}) => {
  const {showError, showSuccess} = useMessage() || {};
  const {styles: orderStyles, ppcColors} = useOrderDetailsVisuals();
  const pageStyles = useMemo(() => createStyles(ppcColors), [ppcColors]);
  const insets = useSafeAreaInsets();
  const ordersStore = useStore('orders');
  const ordersActions = ordersStore.actions;
  const routeOrder = route?.params?.order || null;
  const order = ordersStore.getters.item || routeOrder;
  const orderHeaderOrder = useMemo(
    () =>
      order
        ? {
            ...order,
            status: {
              ...(order?.status || {}),
              color: resolvePreferredText(order?.status?.color, '#0EA5E9'),
            },
          }
        : null,
    [order],
  );
  const orderId = useMemo(
    () => normalizeOrderId(route?.params?.id || order?.id),
    [order?.id, route?.params?.id],
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);

  const refreshOrder = useCallback(async () => {
    if (!orderId) {
      return null;
    }

    setIsRefreshing(true);
    setLoadFailed(false);
    try {
      return await ordersActions.get(orderId);
    } catch (error) {
      setLoadFailed(true);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [orderId, ordersActions]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (!orderId) {
        return () => {
          active = false;
        };
      }

      setIsRefreshing(true);
      setLoadFailed(false);
      ordersActions
        .get(orderId)
        .catch(() => {
          if (active) {
            setLoadFailed(true);
          }
        })
        .finally(() => {
          if (active) {
            setIsRefreshing(false);
          }
        });

      return () => {
        active = false;
      };
    }, [orderId, ordersActions]),
  );

  const logistics = useMemo(
    () => resolveOrderLogisticsSnapshot(order),
    [order],
  );

  const requestDriverDisabled = requestLoading || !orderId || !logistics.canRequestDriver;

  const handleRequestDriver = useCallback(async () => {
    if (requestDriverDisabled || !orderId) {
      return;
    }

    try {
      setRequestLoading(true);
      const response = await api.fetch(
        `/marketplace/integrations/uber/orders/${orderId}/request-driver`,
        {
          method: 'POST',
        },
      );

      const actionResult = normalizeActionResult(response);
      if (String(actionResult?.errno ?? '0') !== '0') {
        throw actionResult || response;
      }

      await refreshOrder();
      showSuccess?.('Motoboy solicitado ao Uber.');
    } catch (error) {
      showError?.(formatApiError(error));
    } finally {
      setRequestLoading(false);
    }
  }, [orderId, refreshOrder, requestDriverDisabled, showError, showSuccess]);

  const handleOpenTracking = useCallback(async () => {
    const trackingUrl = normalizeText(logistics?.uberState?.tracking_url);
    if (!trackingUrl) {
      return;
    }

    try {
      await Linking.openURL(trackingUrl);
    } catch {
      showError?.('Nao foi possivel abrir o rastreio.');
    }
  }, [logistics?.uberState?.tracking_url, showError]);

  const pickupAddressLines = useMemo(
    () => renderAddressLines(logistics.pickupAddressParts),
    [logistics.pickupAddressParts],
  );
  const dropoffAddressLines = useMemo(
    () => renderAddressLines(logistics.dropoffAddressParts),
    [logistics.dropoffAddressParts],
  );
  const pickupContactLines = useMemo(
    () => renderContactLines(logistics.pickupContact),
    [logistics.pickupContact],
  );
  const dropoffContactLines = useMemo(
    () => renderContactLines(logistics.dropoffContact),
    [logistics.dropoffContact],
  );

  const logisticsStatus = normalizeText(
    logistics?.uberState?.status ||
      logistics?.uberState?.order_status ||
      logistics?.uberState?.delivery_status ||
      logistics?.uberState?.state,
  );
  const logisticsRequestedAt = normalizeText(logistics?.uberState?.requested_at);
  const logisticsDeliveryId = normalizeText(logistics?.uberState?.delivery_id);
  const logisticsEstimateId = normalizeText(logistics?.uberState?.estimate_id);
  const logisticsStoreId = normalizeText(logistics?.uberState?.store_id);
  const logisticsTrackingUrl = normalizeText(logistics?.uberState?.tracking_url);
  const logisticsRiderName = normalizeText(logistics?.uberState?.rider_name);
  const logisticsRiderPhone = normalizeText(logistics?.uberState?.rider_phone);
  const logisticsManagedLabel = logistics.managedByStore
    ? global.t?.t('orders', 'label', 'managedByStore') || 'Gerenciada pela loja'
    : global.t?.t('orders', 'label', 'notManagedByStore') ||
      'Nao gerenciada pela loja';
  const logisticsStatusLabel = logisticsStatus
    ? global.t?.t('orders', 'status', logisticsStatus) || formatHumanLabel(logisticsStatus)
    : global.t?.t('orders', 'label', 'notRequested') || 'Nao solicitado';

  if (!order && loadFailed) {
    return (
      <SafeAreaView style={pageStyles.pageRoot}>
        <View style={[pageStyles.pageScrollContent, {flex: 1, justifyContent: 'center'}]}>
          <View style={orderStyles.detailsSection}>
            <Text style={orderStyles.detailsSectionTitle}>
              {global.t?.t('orders', 'message', 'unableCompleteOperation') ||
                'Nao foi possivel carregar a logistica.'}
            </Text>
            <TouchableOpacity
              onPress={() => refreshOrder().catch(() => {})}
              style={[pageStyles.actionButton, pageStyles.actionButtonPrimary]}>
              <Text
                style={[
                  pageStyles.actionButtonText,
                  pageStyles.actionButtonTextPrimary,
                ]}>
                {global.t?.t('orders', 'button', 'retry') || 'Tentar novamente'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!order && (isRefreshing || orderId)) {
    return (
      <SafeAreaView style={pageStyles.pageRoot}>
        <View style={[pageStyles.pageScrollContent, {flex: 1, justifyContent: 'center'}]}>
          <ActivityIndicator size="small" color={ppcColors.accentInfo} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={pageStyles.pageRoot}>
      <OrderStackedTopBar
        order={orderHeaderOrder}
        isKds
        showActions={false}
        onBackPress={() => navigation?.goBack?.()}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          pageStyles.pageScrollContent,
          {paddingBottom: 24 + Math.max(insets.bottom || 0, 0)},
        ]}>
        <View style={pageStyles.heroCard}>
          <Text style={pageStyles.heroTitle}>
            {global.t?.t('orders', 'title', 'logistics') || 'Logistica'}
          </Text>
          <Text style={pageStyles.heroSubtitle}>
            {global.t?.t('orders', 'message', 'logisticsDescription') ||
              'Coleta, entrega e motoboy do pedido atual.'}
          </Text>
          <View style={pageStyles.statusPill}>
            <Text style={pageStyles.statusPillText}>{logisticsManagedLabel}</Text>
          </View>
        </View>

        <View style={orderStyles.detailsGrid}>
          <View style={orderStyles.detailsCard}>
            <Text style={orderStyles.detailsCardLabel}>
              {global.t?.t('orders', 'label', 'status') || 'Status'}
            </Text>
            <Text style={orderStyles.detailsCardValue}>
              {logisticsStatusLabel}
            </Text>
          </View>
          <View style={orderStyles.detailsCard}>
            <Text style={orderStyles.detailsCardLabel}>
              {global.t?.t('orders', 'label', 'driver') || 'Motoboy'}
            </Text>
            <Text style={orderStyles.detailsCardValue}>
              {logistics.hasDriver
                ? global.t?.t('orders', 'label', 'available') || 'Disponivel'
                : global.t?.t('orders', 'label', 'notAvailable') || 'Sem motoboy'}
            </Text>
          </View>
        </View>

        <View style={orderStyles.detailsTabStack}>
          {renderSection(
            global.t?.t('orders', 'title', 'pickup') || 'Coleta',
            [
              pickupAddressLines[0] ? `Endereço: ${pickupAddressLines[0]}` : '',
              pickupAddressLines[1] ? `Complemento: ${pickupAddressLines[1]}` : '',
              pickupAddressLines[2] ? `Referencia: ${pickupAddressLines[2]}` : '',
              `Contato: ${pickupContactLines.join(' • ')}`,
              logisticsStoreId ? `Store ID: ${logisticsStoreId}` : '',
            ].filter(Boolean),
            orderStyles,
          )}

          {renderSection(
            global.t?.t('orders', 'title', 'delivery') || 'Entrega',
            [
              dropoffAddressLines[0] ? `Endereço: ${dropoffAddressLines[0]}` : '',
              dropoffAddressLines[1] ? `Complemento: ${dropoffAddressLines[1]}` : '',
              dropoffAddressLines[2] ? `Referencia: ${dropoffAddressLines[2]}` : '',
              `Contato: ${dropoffContactLines.join(' • ')}`,
            ].filter(Boolean),
            orderStyles,
          )}

          {renderSection(
            global.t?.t('orders', 'title', 'courier') || 'Motoboy',
            [
              logisticsEstimateId ? `Estimate ID: ${logisticsEstimateId}` : '',
              logisticsDeliveryId ? `Delivery ID: ${logisticsDeliveryId}` : '',
              logisticsRequestedAt
                ? `Solicitado em: ${Formatter.formatDateYmdTodmY(logisticsRequestedAt, true)}`
                : '',
              logisticsRiderName ? `Nome: ${logisticsRiderName}` : '',
              logisticsRiderPhone ? `Telefone: ${logisticsRiderPhone}` : '',
              logisticsTrackingUrl ? `Tracking: ${logisticsTrackingUrl}` : '',
            ].filter(Boolean),
            orderStyles,
          )}
        </View>

        <View style={pageStyles.actionRow}>
          {logisticsTrackingUrl ? (
            <TouchableOpacity
              onPress={handleOpenTracking}
              style={pageStyles.actionButton}>
              <Icon name="open-in-new" size={18} color={ppcColors.accentInfo} />
              <Text style={pageStyles.actionButtonText}>
                {global.t?.t('orders', 'button', 'tracking') || 'Rastreio'}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={handleRequestDriver}
            disabled={requestDriverDisabled}
            style={[
              pageStyles.actionButton,
              pageStyles.actionButtonPrimary,
              requestDriverDisabled && pageStyles.actionButtonDisabled,
            ]}>
            {requestLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon name="local-shipping" size={18} color="#FFFFFF" />
                <Text
                  style={[
                    pageStyles.actionButtonText,
                    pageStyles.actionButtonTextPrimary,
                  ]}>
                  {global.t?.t('orders', 'button', 'requestDriver') ||
                    'Solicitar motoboy'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default OrderLogisticsPage;
