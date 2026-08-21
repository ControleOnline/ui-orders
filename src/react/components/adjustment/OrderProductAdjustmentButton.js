/**
 * Compact action that opens OrderProductAdjustmentModal for a single root item.
 * Renders nothing when context is not allowed (Shop/Totem/client).
 */
import React, {useCallback, useState} from 'react';
import {Pressable, Text} from 'react-native';
import OrderProductAdjustmentModal from './OrderProductAdjustmentModal';
import {canShowOrderProductAdjustment} from '@controleonline/ui-orders/src/react/services/orderProductAdjustment';

const defaultButtonStyle = {
  minHeight: 32,
  paddingHorizontal: 10,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#DCE7F3',
  backgroundColor: '#F8FAFC',
  alignItems: 'center',
  justifyContent: 'center',
};

const defaultLabelStyle = {
  fontSize: 12,
  fontWeight: '700',
  color: '#0B6E99',
};

export default function OrderProductAdjustmentButton({
  orderProduct,
  order,
  deviceId,
  appType,
  isClientContext = false,
  onCommitted,
  buttonStyle,
  labelStyle,
  label,
}) {
  const [open, setOpen] = useState(false);
  const allowed = canShowOrderProductAdjustment({order, appType, isClientContext});

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  if (!allowed || !orderProduct) return null;

  const resolvedLabel =
    label ||
    global.t?.t('orders', 'action', 'adjustProduct') ||
    'Ajustar';

  return (
    <>
      <Pressable
        style={[defaultButtonStyle, buttonStyle]}
        onPress={handleOpen}
        accessibilityRole="button"
        accessibilityLabel={resolvedLabel}>
        <Text style={[defaultLabelStyle, labelStyle]}>{resolvedLabel}</Text>
      </Pressable>
      <OrderProductAdjustmentModal
        visible={open}
        onClose={handleClose}
        orderProduct={orderProduct}
        order={order}
        deviceId={deviceId}
        appType={appType}
        isClientContext={isClientContext}
        onCommitted={result => {
          setOpen(false);
          onCommitted?.(result);
        }}
      />
    </>
  );
}
