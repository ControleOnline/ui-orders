import React, {useEffect, useMemo, useRef} from 'react'
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import {useStore} from '@store'
import css from '@controleonline/ui-orders/src/react/css/orders'
import OrderProducts from '@controleonline/ui-orders/src/react/components/OrderProducts'
import Icon from 'react-native-vector-icons/MaterialIcons'
import {sendFrontendDebugLog} from '@controleonline/ui-common/src/react/utils/frontendDebugLog'

import useOrderDetailsVisuals from './useOrderDetailsVisuals'

import {
  inlineStyle_2116_14,
  inlineStyle_2121_14,
  inlineStyle_2128_20,
} from './orderDetails.styles'

const hasOrderProducts = orderProducts =>
  Array.isArray(orderProducts) && orderProducts.length > 0

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

const OrderItemsTab = ({
  addProductsButtonLabel,
  canAddProductsToOrder = false,
  onAddProduct,
  order = null,
  orderProducts = [],
  renderOrderProductActions = null,
  routeOrderId = '',
  variant = 'main',
}) => {
  const {styles: cssStyles} = css()
  const {ppcColors, styles: localStyles} = useOrderDetailsVisuals()
  const detailsVariant = variant === 'details'
  const orderProductsStore = useStore('order_products')
  const {actions: orderProductsActions, getters: orderProductsGetters} =
    orderProductsStore
  const latestSnapshotRef = useRef('')
  const storeOrderProducts = Array.isArray(orderProductsGetters?.items)
    ? orderProductsGetters.items
    : []
  const normalizedRouteOrderId = Number(routeOrderId || 0)

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

  const resolvedOrderProducts = useMemo(
    () => (hasOrderProducts(orderProducts) ? orderProducts : fallbackOrderProducts),
    [fallbackOrderProducts, orderProducts],
  )

  const resolvedOrderProductsSource = hasOrderProducts(orderProducts)
    ? 'props'
    : fallbackOrderProducts.length > 0
      ? 'store'
      : 'empty'

  useEffect(() => {
    // Fallback for domains where /orders/{id} does not embed orderProducts.
    if (!routeOrderId || hasOrderProducts(orderProducts)) {
      sendFrontendDebugLog({
        channel: 'ui-orders',
        class: 'ControleOnline\\Entity\\Order',
        entityRow: normalizedRouteOrderId || null,
        level: 'notice',
        message: 'OrderItemsTab skipped fallback fetch',
        context: {
          reason: !routeOrderId ? 'missing-route-order-id' : 'embedded-order-products-present',
          routeOrderId: normalizedRouteOrderId || null,
          propCount: Array.isArray(orderProducts) ? orderProducts.length : 0,
          storeCount: storeOrderProducts.length,
          variant,
        },
      })
      return
    }

    sendFrontendDebugLog({
      channel: 'ui-orders',
      class: 'ControleOnline\\Entity\\Order',
      entityRow: normalizedRouteOrderId || null,
      level: 'notice',
      message: 'OrderItemsTab starting fallback fetch',
      context: {
        routeOrderId: normalizedRouteOrderId || null,
        propCount: Array.isArray(orderProducts) ? orderProducts.length : 0,
        storeCount: storeOrderProducts.length,
        variant,
      },
    })

    orderProductsActions
      .getItems({
        'order.id': normalizedRouteOrderId,
        itemsPerPage: 200,
      })
      .then(fetchedOrderProducts =>
        sendFrontendDebugLog({
          channel: 'ui-orders',
          class: 'ControleOnline\\Entity\\Order',
          entityRow: normalizedRouteOrderId || null,
          level: 'notice',
          message: 'OrderItemsTab fallback fetch completed',
          context: {
            routeOrderId: normalizedRouteOrderId || null,
            fetchedCount: Array.isArray(fetchedOrderProducts)
              ? fetchedOrderProducts.length
              : 0,
            variant,
          },
        }),
      )
      .catch(error =>
        sendFrontendDebugLog({
          channel: 'ui-orders',
          class: 'ControleOnline\\Entity\\Order',
          entityRow: normalizedRouteOrderId || null,
          level: 'error',
          message: 'OrderItemsTab fallback fetch failed',
          context: {
            routeOrderId: normalizedRouteOrderId || null,
            error: error?.message || String(error || ''),
            variant,
          },
        }),
      )
      .catch(() => null)
  }, [
    normalizedRouteOrderId,
    orderProducts,
    orderProductsActions,
    routeOrderId,
    storeOrderProducts.length,
    variant,
  ])

  useEffect(() => {
    const snapshot = JSON.stringify({
      routeOrderId: normalizedRouteOrderId || null,
      variant,
      propCount: Array.isArray(orderProducts) ? orderProducts.length : 0,
      storeCount: storeOrderProducts.length,
      fallbackCount: fallbackOrderProducts.length,
      resolvedCount: resolvedOrderProducts.length,
      resolvedSource: resolvedOrderProductsSource,
      firstResolvedId: resolvedOrderProducts[0]?.id || null,
      firstResolvedName: resolvedOrderProducts[0]?.product?.product || null,
    })

    if (latestSnapshotRef.current === snapshot) {
      return
    }

    latestSnapshotRef.current = snapshot

    sendFrontendDebugLog({
      channel: 'ui-orders',
      class: 'ControleOnline\\Entity\\Order',
      entityRow: normalizedRouteOrderId || null,
      level: 'notice',
      message: 'OrderItemsTab render snapshot',
      context: JSON.parse(snapshot),
    })
  }, [
    fallbackOrderProducts.length,
    normalizedRouteOrderId,
    orderProducts,
    resolvedOrderProducts,
    resolvedOrderProductsSource,
    storeOrderProducts.length,
    variant,
  ])

  const productStyles = useMemo(
    () =>
      detailsVariant
        ? {
            itemRow: localStyles.itemRow,
            itemMainRow: localStyles.orderProductItemMainRow,
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
    !hasOrderProducts(orderProducts) &&
    !fallbackOrderProducts.length &&
    orderProductsGetters?.isLoading

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

      <View
        style={[
          cssStyles.itemsSection,
          detailsVariant && localStyles.detailsItemsSection,
        ]}
      >
        {isLoadingFallback ? (
          <View style={localStyles.detailsLoadingState}>
            <ActivityIndicator size="small" color={ppcColors.accentInfo} />
            <Text style={localStyles.detailsLoadingText}>
              {global.t?.t('orders', 'label', 'loading') || 'Carregando itens...'}
            </Text>
          </View>
        ) : (
          <OrderProducts
            order={order}
            orderProducts={resolvedOrderProducts}
            styles={productStyles}
            showDetails
            showPricing
            renderActions={renderOrderProductActions}
          />
        )}
      </View>
    </View>
  )
}

export default OrderItemsTab
