import React, { useMemo } from 'react'
import { Image, Text, View } from 'react-native'

import { withOpacity } from '@controleonline/../../src/styles/branding'
import { resolveFileImageUrl } from '@controleonline/ui-common/src/react/utils/fileUrl'
import Formatter from '@controleonline/ui-common/src/utils/formatter'

import sharedStyles from './OrderProducts.styles'
import {
  buildOrderProductCards,
  formatOrderProductQuantityPrefix,
  getOrderProductFiles,
  normalizeOrderProductQuantity,
} from './OrderProducts.utils'

const REMOVAL_COLOR = '#EF4444'

const resolveCardImageUrl = card => {
  const productFiles = getOrderProductFiles(card?.rootItem)

  for (const productFile of productFiles) {
    const imageUrl = resolveFileImageUrl(productFile?.file || productFile)
    if (imageUrl) {
      return imageUrl
    }
  }

  return ''
}

const resolveCardInitial = card =>
  String(card?.name || card?.rootItem?.product?.product || '?')
    .trim()
    .charAt(0)
    .toUpperCase() || '?'

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
  showImages = false,
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

  const renderGroups = (groups, card, depth = 0) => {
    if (!Array.isArray(groups) || groups.length === 0) {
      return null
    }

    const nestedStyle = depth > 0
      ? {
          marginLeft: 24,
          marginTop: 6,
          paddingLeft: 12,
          borderLeftWidth: 1,
          borderLeftColor: '#CBD5E1',
        }
      : null

    return (
      <View style={[styles.groupWrap, nestedStyle]}>
        {groups.map(group => (
          <View key={`${card.key}-${depth}-${group.id}`} style={styles.groupWrap}>
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

                      {renderGroups(groupItem.groups, card, depth + 1)}
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
    )
  }

  return (
    <>
      {visibleCards.map((card, index) => {
        const rootItem = card.rootItem || {}
        const hasRootItem = Object.keys(rootItem).length > 0
        const isRootZero = hasRootItem && Number(rootItem?.quantity || 0) === 0
        const itemColor = isRootZero ? REMOVAL_COLOR : (card.itemColor || order?.status?.color || '#333')
        const cardImageUrl = showImages ? resolveCardImageUrl(card) : ''
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
                <View style={[sharedStyles.itemLead, styles.itemLead]}>
                  {showImages ? (
                    <View style={[sharedStyles.itemThumbWrap, styles.itemThumbWrap]}>
                      {cardImageUrl ? (
                        <Image
                          source={{ uri: cardImageUrl }}
                          style={[sharedStyles.itemThumbImage, styles.itemThumbImage]}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            sharedStyles.itemThumbPlaceholder,
                            styles.itemThumbPlaceholder,
                          ]}
                        >
                          <Text
                            style={[
                              sharedStyles.itemThumbPlaceholderText,
                              styles.itemThumbPlaceholderText,
                            ]}
                          >
                            {resolveCardInitial(card)}
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : null}

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
                </View>

                {rootActions ? (
                  <View style={[sharedStyles.itemActions, styles.itemActions]}>
                    {rootActions}
                  </View>
                ) : null}
              </View>

              {renderGroups(card.groups, card)}
            </View>
          </View>
        )
      })}
    </>
  )
}

export default OrderProducts
