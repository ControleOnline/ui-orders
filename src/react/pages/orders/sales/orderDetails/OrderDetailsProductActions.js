import React from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import {
  canReopenOrderProductCustomization,
  isOrderProductProductionCompleted,
} from '@controleonline/ui-orders/src/react/components/OrderProducts.utils'

/**
 * Per-item quantity / customize / remove actions for OrderDetails product cards.
 */
export default function OrderDetailsProductActions({
  card,
  orderProduct,
  entryType,
  canMutateOrderProducts,
  confirmRemoveItemId,
  handleDecreaseOpQuantity,
  handleEditCustomizableOrderProduct,
  handleIncreaseOpQuantity,
  handleRemoveOp,
  isOrderProductCommitting,
  localStyles,
  ppcColors,
}) {
  if (!canMutateOrderProducts || !orderProduct) {
  return null
  }

  const isChildEntry = entryType === 'group' || !!card?.parentCardKey
  if (entryType === 'group') {
  return null
  }

  const editableOrderProduct = isChildEntry
  ? orderProduct
  : card?.rootItem || orderProduct
  if (isOrderProductProductionCompleted(editableOrderProduct)) {
  return null
  }

  const orderProductId = String(
  orderProduct?.id ||
  String(orderProduct?.['@id'] || '').replace(/\D/g, ''),
  )
  const quantity = Number(orderProduct?.quantity || 0)
  const isOpLoading = orderProductId ? isOrderProductCommitting(orderProductId) : false
  const isConfirming = orderProductId && confirmRemoveItemId === orderProductId
  const canEditCustomization = canReopenOrderProductCustomization(
  editableOrderProduct,
  )
  if (
  !canEditCustomization &&
  (!orderProductId || isChildEntry)
  ) {
  return null
  }

  return (
  <View style={localStyles.orderProductActionStack}>
    {canEditCustomization && (
      <TouchableOpacity
        accessibilityLabel={`Personalizar ${editableOrderProduct?.product?.product || 'item'}`}
        onPress={() => handleEditCustomizableOrderProduct(editableOrderProduct)}
        style={localStyles.orderProductCustomizeButton}
        disabled={isOpLoading}
      >
        <Icon name="tune" size={16} color={ppcColors.textPrimary} />
      </TouchableOpacity>
    )}

    {!isChildEntry && orderProductId ? (
      isConfirming ? (
        <View style={localStyles.editConfirmRow}>
          <Text style={localStyles.editConfirmText}>Remover?</Text>
          <TouchableOpacity
            onPress={() => handleRemoveOp(orderProduct)}
            style={localStyles.editConfirmYes}
            disabled={isOpLoading}
          >
            {isOpLoading
              ? <InlineLoadingText color="#fff">...</InlineLoadingText>
              : <Icon name="check" size={15} color="#fff" />}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setConfirmRemoveItemId(null)}
            style={localStyles.editConfirmNo}
            disabled={isOpLoading}
          >
            <Icon name="close" size={15} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={localStyles.editQtyRow}>
          <TouchableOpacity
            onPress={() => handleDecreaseOpQuantity(orderProduct)}
            style={localStyles.editQtyBtn}
          >
            <Icon
              name={quantity <= 1 ? 'delete' : 'remove'}
              size={18}
              color={quantity <= 1 ? '#c10015' : ppcColors.textPrimary}
            />
          </TouchableOpacity>
          <View style={localStyles.editQtyBox}>
            <Text style={localStyles.editQtyText}>{quantity}</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleIncreaseOpQuantity(orderProduct)}
            style={localStyles.editQtyBtn}
          >
            <Icon name="add" size={18} color={ppcColors.textPrimary} />
          </TouchableOpacity>
        </View>
      )
    ) : null}
  </View>
  )

}
