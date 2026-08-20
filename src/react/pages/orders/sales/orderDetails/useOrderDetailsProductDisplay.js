import { useMemo } from 'react'
import { extractVisibleOrderExtraEntries } from '@controleonline/ui-orders/src/react/utils/orderExtraData'
import {
  resolveEmbeddedOrderProducts,
  choosePreferredOrderProducts,
  mergeOrderProductWithResolvedProduct,
  isTerminalOrderStatus,
} from './helpers'

export default function useOrderDetailsProductDisplay({
  item,
  orderParam,
  marketplaceSummary,
  filteredStoredOrderProducts,
  isLocallyTerminalOrder,
  localRealStatusKey,
  // other deps discovered in chunk
}) {
  const resolvedDisplayOrderProducts = useMemo(() => {
    const currentOrderProductsPayload = resolveEmbeddedOrderProducts(item)
    const initialOrderProductsPayload = resolveEmbeddedOrderProducts(orderParam)
    const marketplaceOrderProducts = Array.isArray(marketplaceSummary.fallbackOrderProducts)
      ? marketplaceSummary.fallbackOrderProducts
      : []

    return choosePreferredOrderProducts({
      primaryOrderProducts: currentOrderProductsPayload.orderProducts,
      primaryHasOwnOrderProducts: currentOrderProductsPayload.hasOwnOrderProducts,
      fallbackOrderProducts: choosePreferredOrderProducts({
        primaryOrderProducts: filteredStoredOrderProducts,
        fallbackOrderProducts: choosePreferredOrderProducts({
          primaryOrderProducts: initialOrderProductsPayload.orderProducts,
          primaryHasOwnOrderProducts: initialOrderProductsPayload.hasOwnOrderProducts,
          fallbackOrderProducts: marketplaceOrderProducts,
        }),
      }),
    })
  }, [
    item?.orderProducts,
    filteredStoredOrderProducts,
    marketplaceSummary.fallbackOrderProducts,
    orderParam?.orderProducts,
  ])
  const resolvedProductCandidatesById = useMemo(() => {
    const candidates = {}

    ;[
      item?.orderProducts,
      orderParam?.orderProducts,
      storedOrderProducts,
      marketplaceSummary.fallbackOrderProducts,
    ].forEach(orderProductsList => {
      ;(Array.isArray(orderProductsList) ? orderProductsList : []).forEach(orderProduct => {
        const productId = getEntityId(orderProduct?.product)
        const candidateProduct = orderProduct?.product

        if (!productId || !candidateProduct) return

        const currentCandidate = candidates[productId]
        const currentHasUnit = currentCandidate ? !!resolveProductUnitLabel(currentCandidate) : false
        const nextHasUnit = !!resolveOrderItemUnitLabel(orderProduct)

        if (!currentCandidate || (nextHasUnit && !currentHasUnit)) {
          candidates[productId] = candidateProduct
        }
      })
    })

    return candidates
  }, [
    marketplaceSummary.fallbackOrderProducts,
    item?.orderProducts,
    orderParam?.orderProducts,
    storedOrderProducts,
  ])

  const resolvedDisplayOrderProductsWithProductDetails = useMemo(
    () => resolvedDisplayOrderProducts.map(orderProduct => {
      const productId = getEntityId(orderProduct?.product)
      return mergeOrderProductWithResolvedProduct(
        orderProduct,
        productId ? resolvedProductCandidatesById[productId] : null,
      )
    }),
    [resolvedDisplayOrderProducts, resolvedProductCandidatesById],
  )
  const shouldShowOrderAddress =
    !isPurchaseOrder &&
    shouldShowOrderPartyDetails
  const effectiveDisplayedOperationalStatus = useMemo(
    () => ({
      status: localStatusNameKey,
      realStatus: localRealStatusKey,
    }),
    [localRealStatusKey, localStatusNameKey],
  )
  const effectiveLocalStatusNameKey = effectiveDisplayedOperationalStatus.status
  const effectiveLocalRealStatusKey = effectiveDisplayedOperationalStatus.realStatus
  const displayOrderStatusColor = resolvePreferredText(
    item?.status?.color,
    orderParam?.status?.color,
    '#0EA5E9',
  )
  const translatedLocalStatusLabel = translateOrderStatus(
    effectiveLocalStatusNameKey || item?.status?.status || '',
  )
  const translatedLocalRealStatusLabel = translateOrderStatus(
    effectiveLocalRealStatusKey || item?.status?.realStatus || '',
  )
  const resolvedDisplayOrder = useMemo(() => {
    const baseOrder = item || orderParam
    if (!baseOrder) return null

    return {
      ...baseOrder,
      orderProducts: resolvedDisplayOrderProductsWithProductDetails,
      status: {
        ...(baseOrder?.status || {}),
        status: effectiveLocalStatusNameKey || baseOrder?.status?.status || '',
        realStatus: effectiveLocalRealStatusKey || baseOrder?.status?.realStatus || '',
        real_status: effectiveLocalRealStatusKey || baseOrder?.status?.real_status || '',
        color: displayOrderStatusColor,
      },
    }
  }, [
    displayOrderStatusColor,
    effectiveLocalRealStatusKey,
    effectiveLocalStatusNameKey,
    item,
    orderParam,
    resolvedDisplayOrderProductsWithProductDetails,
  ])
  const orderIdentitySource = resolvedDisplayOrder || item || orderParam || null
  const orderAdditionalInfoEntries = useMemo(
    () => extractVisibleOrderExtraEntries(orderIdentitySource),
    [orderIdentitySource],
  )
  const normalizedOrderRealStatus = String(
    effectiveLocalRealStatusKey || '',
  ).toLowerCase()
  const hasTerminalOrderState =
    isLocallyTerminalOrder ||
    isTerminalOrderStatus(normalizedOrderRealStatus)
  const isTerminalOrder = hasTerminalOrderState

  return {
    resolvedDisplayOrderProducts,
    resolvedProductCandidatesById,
    resolvedDisplayOrderProductsWithProductDetails,
    effectiveDisplayedOperationalStatus,
    effectiveLocalStatusNameKey,
    effectiveLocalRealStatusKey,
    resolvedDisplayOrder,
    orderIdentitySource,
    orderAdditionalInfoEntries,
    normalizedOrderRealStatus,
    hasTerminalOrderState,
    isTerminalOrder,
  }
}
