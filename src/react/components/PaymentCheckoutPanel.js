import React from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {View, ScrollView, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import css from '@controleonline/ui-orders/src/react/css/orders';
import PayableToolbar from '@controleonline/ui-orders/src/react/components/PayableToolbar';
import OrderTotalToolbar from '@controleonline/ui-orders/src/react/components/OrderTotalToolbar';
import { inlineStyle_62_26 } from './PaymentCheckoutPanel.styles';

const PaymentCheckoutPanel = ({
  payments = [],
  selectedPayment = {},
  onSelectPayment,
  onPay,
  payDisabled = false,
  invoiceIsSaving = false,
  invoiceError = null,
  error = null,
  topContent = null,
}) => {
  const {styles, globalStyles} = css();

  return (
    <SafeAreaView style={[styles.container]}>
      {topContent}
      {!invoiceIsSaving &&
      !invoiceError &&
      payments &&
      payments.length > 0 &&
      !error ? (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {paddingBottom: 100},
            {flexGrow: 1},
          ]}>
          <View>
            {payments.map(payment => (
              <TouchableOpacity
                key={payment.paymentType.id}
                onPress={() => onSelectPayment(payment)}>
                <View
                  style={[
                    styles.boxPayment,
                    selectedPayment.paymentType?.id === payment.paymentType.id &&
                      styles.selectedBoxPayment,
                  ]}>
                  <View style={styles.paymentIcon}>
                    {selectedPayment.paymentType?.id ===
                    payment.paymentType.id ? (
                      <Icon name="check-box" size={24} color="black" />
                    ) : (
                      <Icon
                        name="check-box-outline-blank"
                        size={22}
                        color="black"
                      />
                    )}
                  </View>
                  <View>
                    <Text style={inlineStyle_62_26}>
                      {payment.paymentType.paymentType}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : null}
      <PayableToolbar />
      <View style={[styles.toolbar]}>
        <OrderTotalToolbar />
        <TouchableOpacity
          onPress={onPay}
          disabled={payDisabled}
          style={[globalStyles.button, payDisabled && {opacity: 0.6}]}>
          <Text style={globalStyles.btnText}>
            {global.t?.t('orders', 'button', 'pay').toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default PaymentCheckoutPanel;
