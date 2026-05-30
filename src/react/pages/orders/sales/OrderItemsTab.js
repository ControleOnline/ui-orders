import React, {useEffect, useMemo, useRef, useState} from 'react'
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import {useStore} from '@store'
import css from '@controleonline/ui-orders/src/react/css/orders'
import OrderProducts from '@controleonline/ui-orders/src/react/components/OrderProducts'
import Icon from 'react-native-vector-icons/MaterialIcons'
import {
  hasDetailedOrderProductMetadata,
  hasOrderProducts,
  needsDetailedOrderProductsFetch,
} from '@controleonline/ui-orders/src/react/utils/orderProductsFetchPolicy'

import useOrderDetailsVisuals from './useOrderDetailsVisuals'

import {
  inlineStyle_2116_14,
  inlineStyle_2121_14,
  inlineStyle_2128_20,
} from './orderDetails.styles'

const getEntityId = entity => {
  if (!entity) return null

  if (typeof entity === 'number' || typeof entity === 'string') {
    const matches = String(entity).match(/\d+/g)
    return matches ? Number(matches[matches.length - 1]) : null
  }

  if (typeof entity === 'object') {
    if (entity.id) return Number(entity.id)
    if (entity['@id']) {
      const matches = String(entity['@id']).match(/\d+/g)
      return matches ? Number(matches[matches.length - 1]) : null
    }
  }

  return null
}

const getEmbeddedOrderProducts = order => {
  if (Array.isArray(order?.orderProducts)) {
    return order.orderProducts
  }

  if (Array.isArray(order?.orderProducts?.member)) {
    return order.orderProducts.member
  }

  if (Array.isArray(order?.orderProducts?.['hydra:member'])) {
    return order.orderProducts['hydra:member']
  }

  return []
}

const getOrderProductCollectionSignature = orderProducts =>
  (Array.isArray(orderProducts) ? orderProducts : [])
    .map(orderProduct =>
      [
        getEntityId(orderProduct),
        getEntityId(orderProduct?.product),
        getEntityId(orderProduct?.order),
        getEntityId(orderProduct?.orderProduct),
        getEntityId(orderProduct?.parentProduct),
        getEntityId(orderProduct?.productGroup),
        Number(orderProduct?.quantity || 0),
        Number(orderProduct?.rootQuantity || orderProduct?.root_quantity || 0),
        String(orderProduct?.status?.status || orderProduct?.status || ''),
      ].join(':'),
    )
    .join('|')

const requestedFallbackOrderKeys = new Set()

export const getOrderProductsFallbackFetchKey = routeOrderId =>
  String(Number(routeOrderId || 0) || '')

export const shouldRequestOrderProductsFallback = ({
  routeOrderId,
  skipFallbackReason,
  lastRequestedRouteOrderId,
  alreadyRequested = false,
}) => {
  if (skipFallbackReason || alreadyRequested) {
    return false
  }

  const fallbackFetchOrderId = getOrderProductsFallbackFetchKey(routeOrderId)

  return (
    !!fallbackFetchOrderId &&
    fallbackFetchOrderId !== String(lastRequestedRouteOrderId || '')
  )
}

export const shouldRequestOrderDetails = ({
  routeOrderId,
  resolvedOrderId,
  orderProducts,
}) => {
  if (!routeOrderId) {
    return false
  }

  if (!resolvedOrderId) {
    return true
  }

  return (
    hasOrderProducts(orderProducts) &&
    needsDetailedOrderProductsFetch(orderProducts)
  )
}

export const getOrderSyncSignature = order => {
  const orderProducts = getEmbeddedOrderProducts(order)

  return [
    String(getEntityId(order) || ''),
    String(order?.status?.status || ''),
    String(order?.status?.realStatus || order?.status?.real_status || ''),
    String(order?.status?.color || ''),
    String(getEntityId(order?.client) || ''),
    String(getEntityId(order?.addressDestination) || ''),
    String(order?.comments || order?.remark || order?.description || ''),
    getOrderProductCollectionSignature(orderProducts),
  ].join('||')
}

const OrderItemsTab = ({
  addProductsButtonLabel,
  canAddProductsToOrder = false,
  onAddProduct,
  onQuickAddProduct = null,
  order = null,
  orderProducts = null,
  productSearchLoading = false,
  productSearchResults = [],
  productSearchSelectionId = '',
  productSearchText = '',
  renderOrderProductActions = null,
  routeOrderId = '',
  showPricing = true,
  showRootQuantityPrefix = true,
  showQueuePresentation = true,
  variant = 'main',
  setProductSearchText = null,
}) => {
  const {styles: cssStyles} = css()
  const {ppcColors, styles: localStyles} = useOrderDetailsVisuals()
  const detailsVariant = variant === 'details'
  const ordersStore = useStore('orders')
  const orderProductsStore = useStore('order_products')
  const {actions: ordersActions} = ordersStore
  const {actions: orderProductsActions, getters: orderProductsGetters} =
    orderProductsStore
  const [resolvedOrder, setResolvedOrder] = useState(order)
  const [isLoadingOrderDetails, setIsLoadingOrderDetails] = useState(false)
  const resolvedOrderSignatureRef = useRef(getOrderSyncSignature(order))
  const providedOrderProducts = useMemo(
    () => (Array.isArray(orderProducts) ? orderProducts : []),
    [orderProducts],
  )
  const storeOrderProducts = Array.isArray(orderProductsGetters?.items)
    ? orderProductsGetters.items
    : []
  const normalizedRouteOrderId = Number(routeOrderId || 0)
  const fallbackRequestKey = getOrderProductsFallbackFetchKey(normalizedRouteOrderId)
  const resolvedOrderProductsFromOrder = useMemo(
    () => getEmbeddedOrderProducts(resolvedOrder),
    [resolvedOrder],
  )
  const primaryOrderProducts = useMemo(
    () =>
      hasOrderProducts(providedOrderProducts)
        ? providedOrderProducts
        : resolvedOrderProductsFromOrder,
    [providedOrderProducts, resolvedOrderProductsFromOrder],
  )
  const isFallbackFetchLoading = Boolean(orderProductsGetters?.isLoading)
  const hasFallbackFetchError = !!orderProductsGetters?.error
  const fallbackFetchOrderIdRef = useRef('')
  const orderFetchOrderIdRef = useRef('')

  const fallbackOrderProducts = useMemo(
    () =>
      storeOrderProducts.filter(orderProduct => {
        const orderProductOrderId = getEntityId(orderProduct?.order)

        if (!normalizedRouteOrderId || !orderProductOrderId) {
          return true
        }

        return orderProductOrderId === normalizedRouteOrderId
      }),
    [normalizedRouteOrderId, storeOrderProducts],
  )

  const requiresDetailedFallback = needsDetailedOrderProductsFetch(
    primaryOrderProducts,
  )
  const fallbackHasDetailedPayload =
    hasDetailedOrderProductMetadata(fallbackOrderProducts)
  const fallbackAlreadyRequested =
    !!fallbackRequestKey && requestedFallbackOrderKeys.has(fallbackRequestKey)
  const shouldUseFallbackOrderProducts =
    requiresDetailedFallback &&
    fallbackOrderProducts.length > 0 &&
    fallbackHasDetailedPayload

  const resolvedOrderProducts = useMemo(
    () =>
      shouldUseFallbackOrderProducts
        ? fallbackOrderProducts
        : hasOrderProducts(primaryOrderProducts)
          ? primaryOrderProducts
          : fallbackOrderProducts,
    [fallbackOrderProducts, primaryOrderProducts, shouldUseFallbackOrderProducts],
  )
  const shouldFetchOrderDetails = shouldRequestOrderDetails({
    routeOrderId: normalizedRouteOrderId,
    resolvedOrderId: resolvedOrder?.id,
    orderProducts: primaryOrderProducts,
  })
  const orderSyncSignature = useMemo(() => getOrderSyncSignature(order), [order])

  let skipFallbackReason = ''

  if (!routeOrderId) {
    skipFallbackReason = 'missing-route-order-id'
  } else if (!requiresDetailedFallback) {
    skipFallbackReason = 'embedded-order-products-sufficient'
  } else if (isFallbackFetchLoading) {
    skipFallbackReason = 'fallback-order-products-loading'
  } else if (hasFallbackFetchError) {
    skipFallbackReason = 'fallback-order-products-error'
  } else if (fallbackAlreadyRequested) {
    skipFallbackReason = 'fallback-order-products-already-requested'
  } else if (fallbackOrderProducts.length > 0 && fallbackHasDetailedPayload) {
    skipFallbackReason = 'fallback-order-products-already-loaded'
  }

  useEffect(() => {
    if (!fallbackRequestKey) {
      return;
    }

    if (!requiresDetailedFallback || fallbackHasDetailedPayload) {
      requestedFallbackOrderKeys.delete(fallbackRequestKey);
    }
  }, [fallbackHasDetailedPayload, fallbackRequestKey, requiresDetailedFallback]);

  useEffect(() => {
    if (!orderSyncSignature) {
      return
    }

    if (resolvedOrderSignatureRef.current === orderSyncSignature) {
      return
    }

    resolvedOrderSignatureRef.current = orderSyncSignature
    setResolvedOrder(order)
  }, [order, orderSyncSignature])

  useEffect(() => {
    orderFetchOrderIdRef.current = ''
  }, [normalizedRouteOrderId, order?.id])

  useEffect(() => {
    if (!shouldFetchOrderDetails) {
      setIsLoadingOrderDetails(false)
      return undefined
    }

    let cancelled = false
    const fetchOrderId = getOrderProductsFallbackFetchKey(
      normalizedRouteOrderId,
    )

    if (orderFetchOrderIdRef.current === fetchOrderId) {
      return undefined
    }

    orderFetchOrderIdRef.current = fetchOrderId
    setIsLoadingOrderDetails(true)

    ordersActions
      .get(normalizedRouteOrderId)
      .then(fetchedOrder => {
        if (!cancelled && fetchedOrder) {
          resolvedOrderSignatureRef.current = getOrderSyncSignature(fetchedOrder)
          setResolvedOrder(fetchedOrder)
        }
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) {
          setIsLoadingOrderDetails(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [normalizedRouteOrderId, ordersActions, shouldFetchOrderDetails])

  useEffect(() => {
    if (requiresDetailedFallback) {
      return
    }

    fallbackFetchOrderIdRef.current = ''
  }, [normalizedRouteOrderId, requiresDetailedFallback])

  useEffect(() => {
    // Use /order_products only when the embedded order payload is missing or
    // lacks the grouping metadata required to rebuild customization hierarchy.
    if (
      !shouldRequestOrderProductsFallback({
        routeOrderId: normalizedRouteOrderId,
        skipFallbackReason,
        lastRequestedRouteOrderId: fallbackFetchOrderIdRef.current,
        alreadyRequested: fallbackAlreadyRequested,
      })
    ) {
      return
    }

    const fallbackFetchOrderId = fallbackRequestKey

    // Some backends can keep returning the same incomplete payload on rerender;
    // remember the first attempt so the screen does not keep re-fetching.
    fallbackFetchOrderIdRef.current = fallbackFetchOrderId
    if (fallbackFetchOrderId) {
      requestedFallbackOrderKeys.add(fallbackFetchOrderId);
    }

    orderProductsActions
      .getItems({
        'order.id': normalizedRouteOrderId,
        itemsPerPage: 200,
      })
      .then(response => {
        if (fallbackFetchOrderId && hasDetailedOrderProductMetadata(response)) {
          requestedFallbackOrderKeys.delete(fallbackFetchOrderId);
        }

        return response;
      })
      .catch(() => null)
  }, [
    normalizedRouteOrderId,
    fallbackAlreadyRequested,
    fallbackRequestKey,
    orderProductsActions,
    skipFallbackReason,
  ])

  const productStyles = useMemo(
    () =>
      detailsVariant
        ? {
            itemRow: localStyles.itemRow,
            itemMainRow: localStyles.orderProductItemMainRow,
            itemLead: localStyles.orderProductItemLead,
            itemThumbWrap: localStyles.orderProductThumbWrap,
            itemThumbImage: localStyles.orderProductThumbImage,
            itemThumbPlaceholder: localStyles.orderProductThumbPlaceholder,
            itemThumbPlaceholderText: localStyles.orderProductThumbPlaceholderText,
            itemContent: localStyles.orderProductItemContent,
            metaWrap: localStyles.orderProductMetaWrap,
            queueBadge: localStyles.orderProductQueueBadge,
            queueBadgeDot: localStyles.orderProductQueueBadgeDot,
            queueBadgeText: localStyles.orderProductQueueBadgeText,
            itemActions: localStyles.orderProductItemActions,
            priceRow: localStyles.orderProductPriceRow,
            text: localStyles.text,
            subText: localStyles.subText,
            qtyText: localStyles.qtyText,
            statusMarker: localStyles.statusMarker,
            groupWrap: localStyles.orderProductGroupWrap,
            groupTitlePill: localStyles.orderProductGroupTitlePill,
            groupTitle: localStyles.orderProductGroupTitle,
            groupItem: localStyles.orderProductGroupItem,
            groupItemMainRow: localStyles.orderProductGroupItemRow,
            groupItemContent: localStyles.orderProductGroupItemContent,
            groupItemMetaWrap: localStyles.orderProductGroupItemMetaWrap,
            groupItemActions: localStyles.orderProductGroupItemActions,
            groupItemText: localStyles.orderProductGroupItemText,
            groupItemMetaText: localStyles.orderProductGroupItemMetaText,
            groupItemPriceText: localStyles.orderProductGroupItemPriceText,
          }
        : {
            itemRow: localStyles.mobileProductItemRow,
            itemMainRow: localStyles.orderProductItemMainRow,
            itemLead: localStyles.orderProductItemLead,
            itemThumbWrap: localStyles.orderProductThumbWrap,
            itemThumbImage: localStyles.orderProductThumbImage,
            itemThumbPlaceholder: localStyles.orderProductThumbPlaceholder,
            itemThumbPlaceholderText: localStyles.orderProductThumbPlaceholderText,
            itemContent: localStyles.orderProductItemContent,
            metaWrap: localStyles.orderProductMetaWrap,
            queueBadge: localStyles.orderProductQueueBadge,
            queueBadgeDot: localStyles.orderProductQueueBadgeDot,
            queueBadgeText: localStyles.orderProductQueueBadgeText,
            itemActions: localStyles.orderProductItemActions,
            priceRow: localStyles.orderProductPriceRow,
            text: localStyles.mobileProductText,
            subText: localStyles.mobileProductSubText,
            qtyText: localStyles.mobileProductQtyText,
            statusMarker: localStyles.mobileProductStatusMarker,
            groupWrap: localStyles.orderProductGroupWrap,
            groupTitlePill: localStyles.orderProductGroupTitlePill,
            groupTitle: localStyles.orderProductGroupTitle,
            groupItem: localStyles.orderProductGroupItem,
            groupItemMainRow: localStyles.orderProductGroupItemRow,
            groupItemContent: localStyles.orderProductGroupItemContent,
            groupItemMetaWrap: localStyles.orderProductGroupItemMetaWrap,
            groupItemActions: localStyles.orderProductGroupItemActions,
            groupItemText: localStyles.orderProductGroupItemText,
            groupItemMetaText: localStyles.orderProductGroupItemMetaText,
            groupItemPriceText: localStyles.orderProductGroupItemPriceText,
          },
    [detailsVariant, localStyles],
  )

  const isLoadingFallback =
    !hasOrderProducts(primaryOrderProducts) &&
    !fallbackOrderProducts.length &&
    orderProductsGetters?.isLoading
  const showLoadingState = isLoadingOrderDetails || isLoadingFallback
  const currentOrder = resolvedOrder || order

  return (
    <View style={localStyles.detailsTabStack}>
      <View style={inlineStyle_2116_14}>
        <Text style={[localStyles.mobileProductsTitle, {flex: 1}]}>
          {global.t?.t('orders', 'title', 'orderItems')}
        </Text>
        {canAddProductsToOrder && !detailsVariant && (
          <TouchableOpacity
            onPress={onAddProduct}
            style={inlineStyle_2121_14({
              ppcColors: ppcColors,
            })}
          >
            <Icon name="add-circle" size={14} color="#fff" />
            <Text style={inlineStyle_2128_20}>{addProductsButtonLabel}</Text>
          </TouchableOpacity>
        )}
      </View>

      {canAddProductsToOrder && typeof setProductSearchText === 'function' && (
        <View style={localStyles.detailsProductSearchStack}>
          <View
            style={[
              localStyles.assignmentSearchBox,
              localStyles.detailsProductSearchBox,
            ]}
          >
            <Icon name="search" size={18} color={ppcColors.textSecondary} />
            <TextInput
              value={productSearchText}
              onChangeText={setProductSearchText}
              placeholder="Pesquisar e adicionar produto"
              placeholderTextColor={ppcColors.textSecondary}
              autoCapitalize="none"
              returnKeyType="search"
              style={localStyles.assignmentSearchInput}
            />
            {productSearchLoading && (
              <ActivityIndicator size="small" color={ppcColors.primary} />
            )}
          </View>

          {String(productSearchText || '').trim().length >= 2 && (
            <View style={localStyles.detailsProductSearchResults}>
              {Array.isArray(productSearchResults) && productSearchResults.length > 0 ? (
                productSearchResults.map(product => {
                  const productId = String(product?.id || product?.['@id'] || '')
                  const isSelecting = productSearchSelectionId === productId

                  return (
                    <TouchableOpacity
                      key={productId || product?.sku || product?.product}
                      onPress={() => onQuickAddProduct?.(product)}
                      disabled={isSelecting}
                      style={[
                        localStyles.assignmentOptionCard,
                        isSelecting && localStyles.inlineActionButtonDisabled,
                      ]}
                    >
                      <View style={localStyles.assignmentOptionTextWrap}>
                        <Text
                          style={localStyles.assignmentOptionTitle}
                          numberOfLines={1}
                        >
                          {product?.product || 'Produto sem nome'}
                        </Text>
                        <Text
                          style={localStyles.assignmentOptionMeta}
                          numberOfLines={1}
                        >
                          {[
                            product?.sku ? `SKU ${product.sku}` : '',
                            product?.description || '',
                          ]
                            .filter(Boolean)
                            .join(' • ')}
                        </Text>
                      </View>
                      {isSelecting ? (
                        <ActivityIndicator size="small" color={ppcColors.primary} />
                      ) : (
                        <Icon name="add-circle" size={20} color={ppcColors.accentInfo} />
                      )}
                    </TouchableOpacity>
                  )
                })
              ) : !productSearchLoading ? (
                <View style={localStyles.assignmentEmptyState}>
                  <Text style={localStyles.assignmentEmptyStateTitle}>
                    Nenhum produto encontrado
                  </Text>
                  <Text style={localStyles.assignmentEmptyStateText}>
                    Refine o nome ou SKU para encontrar o produto que deseja adicionar.
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      )}

      <View
        style={[
          cssStyles.itemsSection,
          detailsVariant && localStyles.detailsItemsSection,
        ]}
      >
        {showLoadingState ? (
          <View style={localStyles.detailsLoadingState}>
            <ActivityIndicator size="small" color={ppcColors.accentInfo} />
            <Text style={localStyles.detailsLoadingText}>
              {global.t?.t('orders', 'label', 'loading') || 'Carregando itens...'}
            </Text>
          </View>
        ) : (
          <OrderProducts
            order={currentOrder}
            orderProducts={resolvedOrderProducts}
            styles={productStyles}
            showDetails
            showPricing={showPricing}
            showImages
            renderActions={renderOrderProductActions}
            showRootQuantityPrefix={showRootQuantityPrefix}
            showQueuePresentation={showQueuePresentation}
          />
        )}
      </View>
    </View>
  )
}

export default OrderItemsTab
