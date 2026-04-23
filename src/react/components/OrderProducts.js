import React, { useMemo } from 'react'
import { Text, View } from 'react-native'

import { withOpacity } from '@controleonline/../../src/styles/branding'
import Formatter from '@controleonline/ui-common/src/utils/formatter'

import sharedStyles from './OrderProducts.styles'
import {
  buildOrderProductCards,
  formatOrderProductQuantityPrefix,
  normalizeOrderProductQuantity,
} from './OrderProducts.utils'

const REMOVAL_COLOR = '#EF4444'

const QueueBadge = ({ presentation, styles }) => {
  if (!presentation?.label) {
    return null
  }

  const badgeColor = presentation.color || '#64748B'

  return (
    <View
      style={[
        sharedStyles.queueBadge,
        styles?.queueBadge,
        {
          borderColor: withOpacity(badgeColor, 0.32),
          backgroundColor: withOpacity(badgeColor, 0.14),
        },
      ]}
    >
      <View
        style={[
          sharedStyles.queueBadgeDot,
          styles?.queueBadgeDot,
          { backgroundColor: badgeColor },
        ]}
      />
      <Text
        style={[
          sharedStyles.queueBadgeText,
          styles?.queueBadgeText,
          { color: badgeColor },
        ]}
      >
        {presentation.label}
      </Text>
    </View>
  )
}

const renderEntryActions = ({
  renderActions,
  entryType,
  card,
  group = null,
  entry,
}) => {
  if (typeof renderActions !== 'function') {
    return null
  }

  return renderActions({
    card,
    entry,
    entryType,
    group,
    orderProduct: entry?.orderProduct || card?.rootItem || null,
  })
}

const OrderProducts = ({
  order = null,
  orderProducts = null,
  styles = {},
  showDetails = false,
  showPricing = showDetails,
  maxCards = null,
  renderActions = null,
}) => {
  const resolvedOrderProducts = Array.isArray(orderProducts)
    ? orderProducts
    : (Array.isArray(order?.orderProducts) ? order.orderProducts : [])

  const productCards = useMemo(
    () => buildOrderProductCards(resolvedOrderProducts, {
      fallbackColor: order?.status?.color,
    }),
    [order?.status?.color, resolvedOrderProducts],
  )

  const visibleCards = useMemo(
    () => (
      maxCards !== null &&
      maxCards !== undefined &&
      Number.isFinite(Number(maxCards))
        ? productCards.slice(0, Math.max(0, Number(maxCards)))
        : productCards
    ),
    [maxCards, productCards],
  )

  return (
    <>
      {visibleCards.map((card, index) => {
        const rootItem = card.rootItem || {}
        const hasRootItem = Object.keys(rootItem).length > 0
        const isRootZero = hasRootItem && Number(rootItem?.quantity || 0) === 0
        const itemColor = isRootZero ? REMOVAL_COLOR : (card.itemColor || order?.status?.color || '#333')
        const rootActions = renderEntryActions({
          renderActions,
          entryType: 'root',
          card,
          entry: {
            orderProduct: rootItem,
            isZero: isRootZero,
            itemColor,
            observation: card.observation,
            description: card.description,
            name: card.name,
            quantity: card.quantity,
            queuePresentation: card.queuePresentation,
            totalPrice: card.totalPrice,
            unitPrice: card.unitPrice,
          },
        })

        return (
          <View key={card.key || `card-${index}`}>
            <View
              style={[
                styles.itemRow,
                {
                  borderLeftWidth: 3,
                  borderLeftColor: itemColor,
                },
              ]}
            >
              <View style={[sharedStyles.itemMainRow, styles.itemMainRow]}>
                <View style={[sharedStyles.itemContent, styles.itemContent]}>
                  <Text style={styles.text} numberOfLines={2}>
                    <Text style={[styles.statusMarker, { color: itemColor }]}>* </Text>
                    {isRootZero ? (
                      <Text style={{ color: REMOVAL_COLOR, fontWeight: 'bold' }}>REMOVER </Text>
                    ) : null}
                    {!isRootZero ? (
                      <Text style={styles.qtyText}>{normalizeOrderProductQuantity(card.quantity)}x </Text>
                    ) : null}
                    {card.name || `Item #${index + 1}`}
                  </Text>

                  <View style={[sharedStyles.metaWrap, styles.metaWrap]}>
                    <QueueBadge presentation={card.queuePresentation} styles={styles} />

                    {showDetails && !!card.description && (
                      <Text style={styles.subText} numberOfLines={2}>
                        {card.description}
                      </Text>
                    )}

                    {showDetails && !!card.observation && (
                      <Text style={styles.subText} numberOfLines={2}>
                        Obs: {card.observation}
                      </Text>
                    )}

                    {showPricing && card.unitPrice > 0 && (
                      <View style={[sharedStyles.priceRow, styles.priceRow]}>
                        <Text style={styles.subText}>
                          {Formatter.formatMoney(card.unitPrice)} / un
                        </Text>
                        <Text style={styles.subText}>
                          {Formatter.formatMoney(card.totalPrice || 0)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {rootActions ? (
                  <View style={[sharedStyles.itemActions, styles.itemActions]}>
                    {rootActions}
                  </View>
                ) : null}
              </View>

              {card.groups.length > 0 && (
                <View style={styles.groupWrap}>
                  {card.groups.map(group => (
                    <View key={`${card.key}-${group.id}`} style={styles.groupWrap}>
                      {!!group.label && (
                        <View style={styles.groupTitlePill}>
                          <Text style={styles.groupTitle}>{group.label}</Text>
                        </View>
                      )}

                      {group.items.map(groupItem => {
                        const childColor = groupItem.isZero ? REMOVAL_COLOR : groupItem.itemColor
                        const childActions = renderEntryActions({
                          renderActions,
                          entryType: 'group',
                          card,
                          group,
                          entry: groupItem,
                        })

                        return (
                          <View key={groupItem.id} style={styles.groupItem}>
                            <View style={[sharedStyles.groupItemMainRow, styles.groupItemMainRow]}>
                              <View style={[sharedStyles.groupItemContent, styles.groupItemContent]}>
                                <Text style={styles.groupItemText}>
                                  <Text style={[styles.statusMarker, { color: childColor }]}>* </Text>
                                  {groupItem.isZero ? (
                                    <Text style={{ color: REMOVAL_COLOR, fontWeight: 'bold' }}>REMOVER </Text>
                                  ) : null}
                                  {!groupItem.isZero && !!formatOrderProductQuantityPrefix(groupItem.quantity) ? (
                                    <Text style={styles.qtyText}>
                                      {formatOrderProductQuantityPrefix(groupItem.quantity)}
                                    </Text>
                                  ) : null}
                                  {groupItem.name}
                                </Text>

                                <View style={[sharedStyles.groupItemMetaWrap, styles.groupItemMetaWrap]}>
                                  <QueueBadge
                                    presentation={groupItem.queuePresentation}
                                    styles={styles}
                                  />

                                  {showDetails && !!groupItem.description && (
                                    <Text style={styles.groupItemMetaText}>
                                      {groupItem.description}
                                    </Text>
                                  )}

                                  {showDetails && !!groupItem.observation && (
                                    <Text style={styles.groupItemMetaText}>
                                      Obs: {groupItem.observation}
                                    </Text>
                                  )}
                                </View>
                              </View>

                              {childActions ? (
                                <View style={[sharedStyles.groupItemActions, styles.groupItemActions]}>
                                  {childActions}
                                </View>
                              ) : showPricing && groupItem.totalPrice > 0 ? (
                                <Text style={styles.groupItemPriceText}>
                                  {Formatter.formatMoney(groupItem.totalPrice)}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        )
                      })}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )
      })}
    </>
  )
}

export default OrderProducts
