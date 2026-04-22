import React, {useEffect, useMemo} from 'react'
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

import useOrderDetailsVisuals from './useOrderDetailsVisuals'

import {
  inlineStyle_2116_14,
  inlineStyle_2121_14,
  inlineStyle_2128_20,
} from './orderDetails.styles'

const hasOrderProducts = orderProducts =>
  Array.isArray(orderProducts) && orderProducts.length > 0

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

  useEffect(() => {
    // Fallback for domains where /orders/{id} does not embed orderProducts.
    if (!routeOrderId || hasOrderProducts(orderProducts)) {
      return
    }

    orderProductsActions
      .getItems({
        'order.id': Number(routeOrderId),
        itemsPerPage: 200,
      })
      .catch(() => null)
  }, [orderProducts, orderProductsActions, routeOrderId])

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
    !hasOrderProducts(orderProducts) && orderProductsGetters?.isLoading

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
            orderProducts={orderProducts}
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
