import React from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import Icon from 'react-native-vector-icons/MaterialIcons';
import useOrderDetailsVisuals from '../useOrderDetailsVisuals';
import OrderMarketplaceActionBar from './OrderMarketplaceActionBar';

// Resumo de marketplace fica fora da tela principal para concentrar integrações em um lugar só.
const OrderMarketplaceSummary = ({marketplace}) => {
  const {styles} = useOrderDetailsVisuals();
  const hasActionButtons =
    Array.isArray(marketplace?.actionButtons) && marketplace.actionButtons.length > 0;
  const financialAction = marketplace?.financialAction || null;

  if (!marketplace?.enabled) {
    return null;
  }

  if (marketplace.isLoading && !marketplace.hasVisualData && !hasActionButtons) {
    return (
      <View style={styles.detailsLoadingState}>
        <ActivityIndicator size="small" color="#38BDF8" />
        <Text style={styles.detailsLoadingText}>
          {global.t?.t('orders', 'message', 'loadingIntegrationData')} {marketplace.platformLabel}...
        </Text>
      </View>
    );
  }

  if (!marketplace.hasVisualData && !hasActionButtons) {
    return null;
  }

  return (
    <>
      {hasActionButtons ? (
        <OrderMarketplaceActionBar actions={marketplace.actionButtons} />
      ) : null}

      {!!financialAction ? (
        <TouchableOpacity
          onPress={financialAction.onPress}
          disabled={financialAction.disabled}
          style={[
            styles.detailsMarkPaidButton,
            financialAction.disabled && styles.kdsActionButtonDisabled,
          ]}>
          {financialAction.loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon name="receipt-long" size={18} color="#FFFFFF" />
              <Text style={styles.detailsMarkPaidButtonText}>
                {financialAction.label}
              </Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}

      {marketplace.isLoading && !marketplace.hasVisualData ? (
        <View style={styles.detailsLoadingState}>
          <ActivityIndicator size="small" color="#38BDF8" />
          <Text style={styles.detailsLoadingText}>
            {global.t?.t('orders', 'message', 'loadingIntegrationData')} {marketplace.platformLabel}...
          </Text>
        </View>
      ) : null}

      {marketplace.hasVisualData ? (
        <>
          {marketplace.benefitLines?.length > 0 && (
            <View style={styles.scheduledDeliveryBanner}>
              <Text style={styles.scheduledDeliveryLabel}>
                {global.t?.t('orders', 'title', 'vouchersAndDiscounts') ||
                  'Vouchers e descontos'}
              </Text>
              {marketplace.benefitLines.map(line => (
                <Text key={line.key} style={styles.scheduledDeliveryDate}>
                  {line.label}:{' '}
                  {line.money ? Formatter.formatMoney(line.value || 0) : line.value}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.detailsSection}>
            <Text style={styles.detailsSectionTitle}>{marketplace.operationTitle}</Text>
            {marketplace.usingFallback ? (
              <Text style={styles.food99InfoHint}>
                {global.t?.t('orders', 'message', 'marketplaceSummaryFromSnapshot') ||
                  'Dados de integração exibidos a partir do snapshot salvo no pedido até o state mais recente ser carregado.'}
              </Text>
            ) : null}
            {marketplace.operationLines.map(line => (
              <Text
                key={line.key}
                style={line.strong ? styles.detailsInfoTextStrong : styles.detailsInfoText}>
                {line.label ? `${line.label}: ` : ''}
                {line.value}
              </Text>
            ))}
          </View>

          {marketplace.courierLines.length > 0 && (
            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>{marketplace.courierTitle}</Text>
              {marketplace.courierLines.map(line => (
                <Text key={line.key} style={styles.detailsInfoText}>
                  {line.label ? `${line.label}: ` : ''}
                  {line.value}
                </Text>
              ))}
            </View>
          )}

          {marketplace.financial.length > 0 && (
            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>{marketplace.financeTitle}</Text>
              {marketplace.financial.map(line => (
                <Text
                  key={line.key}
                  style={line.strong ? styles.detailsInfoTextStrong : styles.detailsInfoText}>
                  {line.label}: {line.money ? Formatter.formatMoney(line.value || 0) : line.value}
                </Text>
              ))}
            </View>
          )}

          {marketplace.paymentCards.length > 0 && (
            <View style={styles.detailsGrid}>
              {marketplace.paymentCards.map(card => (
                <View key={card.key} style={styles.detailsCard}>
                  <Text style={styles.detailsCardLabel}>{card.label}</Text>
                  <Text style={styles.detailsCardValue}>
                    {Formatter.formatMoney(card.value || 0)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {marketplace.deliveryPaymentLines.length > 0 && (
            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>
                {global.t?.t('orders', 'title', 'paymentOnDelivery')}
              </Text>
              {marketplace.deliveryPaymentLines.map(line => (
                <Text
                  key={line.key}
                  style={line.strong ? styles.detailsInfoTextStrong : styles.detailsInfoText}>
                  {line.label}: {Formatter.formatMoney(line.value || 0)}
                </Text>
              ))}
            </View>
          )}

          {marketplace.schedulingLines.length > 0 && (
            <View style={styles.scheduledDeliveryBanner}>
              <Text style={styles.scheduledDeliveryLabel}>
                {global.t?.t('orders', 'title', 'scheduledDelivery')}
              </Text>
              {marketplace.schedulingLines.map(line => (
                <Text key={line.key} style={styles.scheduledDeliveryDate}>
                  {line.label}: {line.value}
                </Text>
              ))}
            </View>
          )}

          {marketplace.taxDocumentLines.length > 0 && (
            <View style={styles.taxDocumentBanner}>
              <Text style={styles.taxDocumentLabel}>{marketplace.taxDocumentTitle}</Text>
              {marketplace.taxDocumentLines.map(line => (
                <Text key={line.key} style={styles.taxDocumentText}>
                  {line.label ? `${line.label}: ` : ''}
                  {line.value}
                </Text>
              ))}
            </View>
          )}

          {marketplace.customerLines.length > 0 && (
            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>
                {global.t?.t('orders', 'title', 'customer')}
              </Text>
              {marketplace.customerLines.map(line => (
                <Text key={line.key} style={styles.detailsInfoText}>
                  {line.label ? `${line.label}: ` : ''}
                  {line.value}
                </Text>
              ))}
            </View>
          )}

          {marketplace.addressLines.length > 0 && (
            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>
                {global.t?.t('orders', 'title', 'customerAddress')}
              </Text>
              {marketplace.addressLines.map(line => (
                <Text key={line.key} style={styles.detailsInfoText}>
                  {line.label ? `${line.label}: ` : ''}
                  {line.value}
                </Text>
              ))}
            </View>
          )}

          {marketplace.codesLines.length > 0 && (
            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>
                {global.t?.t('orders', 'title', 'codesAndSupport')}
              </Text>
              {marketplace.codesLines.map(line => (
                <Text key={line.key} style={styles.detailsInfoText}>
                  {line.label}: {line.value}
                </Text>
              ))}
            </View>
          )}

          {marketplace.observationLines.length > 0 && (
            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>
                {global.t?.t('orders', 'title', 'observations')}
              </Text>
              {marketplace.observationLines.map(line => (
                <Text key={line.key} style={styles.detailsInfoText}>
                  {line.label ? `${line.label}: ` : ''}
                  {line.value}
                </Text>
              ))}
            </View>
          )}
        </>
      ) : null}
    </>
  );
};

export default OrderMarketplaceSummary;
