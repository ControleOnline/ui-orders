import { useCallback, useEffect, useState } from 'react'

import {
  canReopenOrderProductCustomization,
  isOrderProductProductionCompleted,
} from '@controleonline/ui-orders/src/react/components/OrderProducts.utils'

import { getEntityId } from './helpers'

/**
 * Quantity / remove / edit handlers for order products on OrderDetails.
 * Owns confirm-remove UI state and customize navigation.
 */
export default function useOrderDetailsProductMutations({
  scheduleQuantityChange,
  getScheduledQuantity,
  canMutateOrderProducts,
  navigation,
  route,
  isSingleItemOperationMode,
  showError,
}) {
  const [confirmRemoveItemId, setConfirmRemoveItemId] = useState(null)

  useEffect(() => {
    if (!canMutateOrderProducts) {
      setConfirmRemoveItemId(null)
    }
  }, [canMutateOrderProducts])

  const handleUpdateOpQuantity = useCallback(
    (op, newQtyOrUpdater) => {
      const id = String(op?.id || String(op?.['@id'] || '').replace(/\D/g, ''))
      if (!id) return
      scheduleQuantityChange(op, newQtyOrUpdater)
    },
    [scheduleQuantityChange],
  )

  const handleIncreaseOpQuantity = useCallback(
    op => {
      setConfirmRemoveItemId(null)
      handleUpdateOpQuantity(op, currentQuantity => currentQuantity + 1)
    },
    [handleUpdateOpQuantity],
  )

  const handleDecreaseOpQuantity = useCallback(
    op => {
      const id = String(op?.id || String(op?.['@id'] || '').replace(/\D/g, ''))
      if (!id) return

      if (getScheduledQuantity(op) <= 1) {
        setConfirmRemoveItemId(id)
        return
      }

      setConfirmRemoveItemId(null)
      handleUpdateOpQuantity(op, currentQuantity => currentQuantity - 1)
    },
    [getScheduledQuantity, handleUpdateOpQuantity],
  )

  const handleRemoveOp = useCallback(
    op => {
      const id = String(op?.id || String(op?.['@id'] || '').replace(/\D/g, ''))
      if (!id) return
      setConfirmRemoveItemId(null)
      scheduleQuantityChange(op, 0)
    },
    [scheduleQuantityChange],
  )

  const handleEditCustomizableOrderProduct = useCallback(
    orderProduct => {
      if (!canMutateOrderProducts) {
        return
      }

      const rootOrderProduct = orderProduct || null
      const product = rootOrderProduct?.product
      const productId = getEntityId(product)

      if (!rootOrderProduct || !product || !productId) {
        showError(
          'Não foi possível identificar o item customizável deste pedido.',
        )
        return
      }

      if (isOrderProductProductionCompleted(rootOrderProduct)) {
        return
      }

      navigation.navigate('CustomizeScreen', {
        productId,
        orderProductId: getEntityId(rootOrderProduct),
        returnDepth: 1,
        interactionMode: route?.params?.interactionMode,
        singleItemMode: isSingleItemOperationMode,
      })
    },
    [
      canMutateOrderProducts,
      navigation,
      route?.params?.interactionMode,
      isSingleItemOperationMode,
      showError,
    ],
  )

  return {
    confirmRemoveItemId,
    setConfirmRemoveItemId,
    handleUpdateOpQuantity,
    handleIncreaseOpQuantity,
    handleDecreaseOpQuantity,
    handleRemoveOp,
    handleEditCustomizableOrderProduct,
  }
}
