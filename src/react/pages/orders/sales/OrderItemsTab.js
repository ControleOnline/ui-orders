import React, {useEffect, useMemo, useRef, useState} from 'react'
import {
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import {useStore} from '@store'
import Formatter from '@controleonline/ui-common/src/utils/formatter'
import css from '@controleonline/ui-orders/src/react/css/orders'
import OrderProducts from '@controleonline/ui-orders/src/react/components/OrderProducts'
import useCompleteOrderProductsFallback from '@controleonline/ui-orders/src/react/hooks/useCompleteOrderProductsFallback'
import Icon from 'react-native-vector-icons/MaterialIcons'
import {resolveProductCoverUrl} from '@controleonline/ui-products/src/react/domain/productMedia'
import {
  hasCompleteEmbeddedOrderProductsTree,
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

const resolveEmbeddedOrderProducts = order => ({
  hasOwnOrderProducts:
    !!order && Object.prototype.hasOwnProperty.call(order, 'orderProducts'),
  orderProducts: getEmbeddedOrderProducts(order),
})

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
        String(orderProduct?.price ?? ''),
        String(orderProduct?.total ?? ''),
        String(orderProduct?.status?.status || orderProduct?.status || ''),
      ].join(':'),
    )
    .join('|')

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
    String(order?.price ?? ''),
    String(order?.total ?? ''),
    order?.orderProductsTreeComplete === true ? 'tree-complete' : 'tree-partial',
    getOrderProductCollectionSignature(orderProducts),
  ].join('||')
}

const OrderItemsTab = ({
  addProductsButtonLabel,
  canAddProductsToOrder = false,
  onAddProduct,
  onCustomizeProduct = null,
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
  const orderProductsStore = useStore('order_products')
  const ordersStore = useStore('orders')
  const {actions: orderProductsActions} = orderProductsStore
  const {actions: ordersActions} = ordersStore
  const [resolvedOrder, setResolvedOrder] = useState(order)
  const resolvedOrderSignatureRef = useRef(getOrderSyncSignature(order))
  const providedOrderProducts = useMemo(
    () => (Array.isArray(orderProducts) ? orderProducts : []),
    [orderProducts],
  )
  const normalizedRouteOrderId = Number(routeOrderId || 0)
  const authoritativeOrder = order || resolvedOrder
  const resolvedOrderProductsFromOrder = useMemo(
    () => resolveEmbeddedOrderProducts(authoritativeOrder),
    [authoritativeOrder],
  )
  const hasProvidedOrderProducts = Array.isArray(orderProducts)
  const primaryOrderProducts = useMemo(
    () =>
      hasProvidedOrderProducts
        ? providedOrderProducts
        : resolvedOrderProductsFromOrder.orderProducts,
    [
      hasProvidedOrderProducts,
      providedOrderProducts,
      resolvedOrderProductsFromOrder.orderProducts,
    ],
  )
  const primaryHasOwnOrderProducts =
    hasProvidedOrderProducts || resolvedOrderProductsFromOrder.hasOwnOrderProducts
  const primaryTreeIsComplete =
    hasCompleteEmbeddedOrderProductsTree(authoritativeOrder)
  const requiresDetailedFallback =
    !!normalizedRouteOrderId &&
    !primaryTreeIsComplete &&
    (!primaryHasOwnOrderProducts || hasOrderProducts(primaryOrderProducts)) &&
    needsDetailedOrderProductsFetch(primaryOrderProducts)
  const completeFallback = useCompleteOrderProductsFallback({
    actions: orderProductsActions,
    enabled: requiresDetailedFallback,
    orderId: normalizedRouteOrderId,
  })
  const resolvedOrderProducts =
    requiresDetailedFallback && completeFallback.status === 'ready'
      ? completeFallback.items
      : requiresDetailedFallback
        ? []
        : primaryOrderProducts
  const orderSyncSignature = useMemo(() => getOrderSyncSignature(order), [order])

  useEffect(() => {
    if (
      !requiresDetailedFallback ||
      completeFallback.status !== 'ready' ||
      typeof ordersActions?.syncOrderProducts !== 'function'
    ) {
      return
    }

    const hydratedOrder = ordersActions.syncOrderProducts({
      orderId: normalizedRouteOrderId,
      orderProducts: completeFallback.items,
    })

    if (Number(getEntityId(hydratedOrder) || 0) === normalizedRouteOrderId) {
      setResolvedOrder(hydratedOrder)
    }
  }, [
    completeFallback.items,
    completeFallback.status,
    normalizedRouteOrderId,
    ordersActions,
    requiresDetailedFallback,
  ])

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

  const showLoadingState =
    requiresDetailedFallback &&
    (completeFallback.status === 'idle' || completeFallback.status === 'loading')
  const showFallbackError =
    requiresDetailedFallback && completeFallback.status === 'error'
  const currentOrder = authoritativeOrder

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
              <Text style={localStyles.assignmentOptionBadge}>
                {global.t?.t('orders', 'label', 'loading') || 'Buscando'}
              </Text>
            )}
          </View>

          {String(productSearchText || '').trim().length >= 2 && (
            <View style={localStyles.detailsProductSearchResults}>
              {Array.isArray(productSearchResults) && productSearchResults.length > 0 ? (
                productSearchResults.map(product => {
                  const productId = String(product?.id || product?.['@id'] || '')
                  const isSelecting = productSearchSelectionId === productId
                  const coverUrl = resolveProductCoverUrl(product)
                  const isCustomProduct =
                    String(product?.type || '').trim() === 'custom'

                  return (
                    <TouchableOpacity
                      key={productId || product?.sku || product?.product}
                      onPress={() =>
                        isCustomProduct
                          ? onCustomizeProduct?.(product)
                          : onQuickAddProduct?.(product)
                      }
                      disabled={isSelecting}
                      style={[
                        localStyles.assignmentOptionCard,
                        localStyles.detailsProductSearchResultCard,
                        isSelecting && localStyles.inlineActionButtonDisabled,
                      ]}
                    >
                      <View style={localStyles.detailsProductSearchThumb}>
                        {coverUrl ? (
                          <Image
                            source={{uri: coverUrl}}
                            resizeMode="cover"
                            style={localStyles.detailsProductSearchImage}
                          />
                        ) : (
                          <Icon name="image" size={20} color={ppcColors.textSecondary} />
                        )}
                      </View>
                      <View style={localStyles.assignmentOptionTextWrap}>
                        <Text
                          style={localStyles.assignmentOptionTitle}
                          numberOfLines={1}
                        >
                          {product?.product || 'Produto sem nome'}
                        </Text>
                        <Text
                          style={localStyles.detailsProductSearchPrice}
                          numberOfLines={1}
                        >
                          {Formatter.formatMoney(product?.price || 0)}
                        </Text>
                      </View>
                      {isSelecting ? (
                        <Text style={localStyles.assignmentOptionBadge}>
                          {global.t?.t('orders', 'label', 'loading') || 'Carregando'}
                        </Text>
                      ) : isCustomProduct ? (
                        <View style={localStyles.detailsProductSearchCustomButton}>
                          <Text style={localStyles.detailsProductSearchCustomText}>
                            CUSTOMIZAR
                          </Text>
                        </View>
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
        {showFallbackError ? (
          <View style={localStyles.detailsLoadingState}>
            <Text style={localStyles.detailsLoadingText}>
              Não foi possível carregar todos os itens do pedido.
            </Text>
            <TouchableOpacity
              onPress={() => void completeFallback.retry().catch(() => null)}
              style={[
                localStyles.inlineActionButton,
                localStyles.inlineActionButtonPrimary,
              ]}
            >
              <Text style={localStyles.inlineActionButtonText}>
                Tentar novamente
              </Text>
            </TouchableOpacity>
          </View>
        ) : showLoadingState ? (
          <View style={localStyles.detailsLoadingState}>
            <Text style={localStyles.detailsLoadingText}>
              {global.t?.t('orders', 'label', 'loading') || 'Carregando itens...'}
            </Text>
          </View>
        ) : (
          <OrderProducts
            compactTree
            order={currentOrder}
            orderProducts={resolvedOrderProducts}
            styles={productStyles}
            showDetails
            hierarchyGuideColor={ppcColors.accentInfo}
            hierarchySurfaceColor={ppcColors.cardBg}
            showHierarchyGuides
            showPricing={showPricing}
            showImages
            showGroupStatusMarker={false}
            renderActions={renderOrderProductActions}
            showRootStatusMarker={false}
            showRootQuantityPrefix={showRootQuantityPrefix}
            showQueuePresentation={showQueuePresentation}
          />
        )}
      </View>
    </View>
  )
}

export default OrderItemsTab
