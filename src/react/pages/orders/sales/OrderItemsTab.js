import React, {useEffect, useMemo} from 'react'
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

const OrderItemsTab = ({
  addProductsButtonLabel,
  canAddProductsToOrder = false,
  onAddProduct,
  onQuickAddProduct = null,
  order = null,
  orderProducts = [],
  productSearchLoading = false,
  productSearchResults = [],
  productSearchSelectionId = '',
  productSearchText = '',
  renderOrderProductActions = null,
  routeOrderId = '',
  showPricing = true,
  showRootQuantityPrefix = true,
  variant = 'main',
  setProductSearchText = null,
}) => {
  const {styles: cssStyles} = css()
  const {ppcColors, styles: localStyles} = useOrderDetailsVisuals()
  const detailsVariant = variant === 'details'
  const orderProductsStore = useStore('order_products')
  const {actions: orderProductsActions, getters: orderProductsGetters} =
    orderProductsStore
  const storeOrderProducts = Array.isArray(orderProductsGetters?.items)
    ? orderProductsGetters.items
    : []
  const normalizedRouteOrderId = Number(routeOrderId || 0)
  const isFallbackFetchLoading = Boolean(orderProductsGetters?.isLoading)
  const hasFallbackFetchError = !!orderProductsGetters?.error

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

  const requiresDetailedFallback = needsDetailedOrderProductsFetch(orderProducts)
  const fallbackHasDetailedPayload =
    hasDetailedOrderProductMetadata(fallbackOrderProducts)
  const shouldUseFallbackOrderProducts =
    requiresDetailedFallback &&
    fallbackOrderProducts.length > 0 &&
    fallbackHasDetailedPayload

  const resolvedOrderProducts = useMemo(
    () =>
      shouldUseFallbackOrderProducts
        ? fallbackOrderProducts
        : hasOrderProducts(orderProducts)
          ? orderProducts
          : fallbackOrderProducts,
    [fallbackOrderProducts, orderProducts, shouldUseFallbackOrderProducts],
  )

  const skipFallbackReason = !routeOrderId
    ? 'missing-route-order-id'
    : !requiresDetailedFallback
      ? 'embedded-order-products-sufficient'
      : isFallbackFetchLoading
        ? 'fallback-order-products-loading'
        : hasFallbackFetchError
          ? 'fallback-order-products-error'
      : fallbackOrderProducts.length > 0 && fallbackHasDetailedPayload
        ? 'fallback-order-products-already-loaded'
        : ''

  useEffect(() => {
    // Use /order_products only when the embedded order payload is missing or
    // lacks the grouping metadata required to rebuild customization hierarchy.
    if (skipFallbackReason) {
      return
    }

    orderProductsActions
      .getItems({
        'order.id': normalizedRouteOrderId,
        itemsPerPage: 200,
      })
      .catch(() => null)
  }, [
    fallbackOrderProducts.length,
    fallbackHasDetailedPayload,
    hasFallbackFetchError,
    isFallbackFetchLoading,
    requiresDetailedFallback,
    normalizedRouteOrderId,
    orderProducts,
    orderProductsActions,
    routeOrderId,
    skipFallbackReason,
    storeOrderProducts.length,
    variant,
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
            showPricing={showPricing}
            showImages
            renderActions={renderOrderProductActions}
            showRootQuantityPrefix={showRootQuantityPrefix}
          />
        )}
      </View>
    </View>
  )
}

export default OrderItemsTab
