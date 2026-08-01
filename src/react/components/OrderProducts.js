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

const REMOVAL_COLOR = '#c10015'

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

  const badgeColor = presentation.color

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
  productCards: providedProductCards = null,
  styles = {},
  showDetails = false,
  showPricing = showDetails,
  maxCards = null,
  renderActions = null,
  showImages = false,
  showRootQuantityPrefix = true,
  showQueuePresentation = true,
  showHierarchyGuides = false,
  showDescriptions = showDetails,
  showRootStatusMarker = true,
  showGroupStatusMarker = true,
  resolveItemColor = null,
  compact = false,
  hierarchyGuideColor = null,
}) => {
  const hierarchyGuidesEnabled = Boolean(showHierarchyGuides)
  const compactEnabled = Boolean(compact)
  const resolvedOrderProducts = Array.isArray(orderProducts)
    ? orderProducts
    : (Array.isArray(order?.orderProducts) ? order.orderProducts : [])
  const groupWrapperStyle = [
    hierarchyGuidesEnabled
      ? styles.groupWrap
      : [
          styles.groupWrap,
          {
            marginLeft: 0,
            paddingLeft: 0,
            borderLeftWidth: 0,
          },
        ],
    compactEnabled && sharedStyles.compactGroupWrap,
  ]

  const productCards = useMemo(
    () => Array.isArray(providedProductCards)
      ? providedProductCards
      : buildOrderProductCards(resolvedOrderProducts, {
          fallbackColor: order?.status?.color,
          resolveItemColor,
        }),
    [
      order?.status?.color,
      providedProductCards,
      resolveItemColor,
      resolvedOrderProducts,
    ],
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

  const visibleCardEntries = useMemo(() => {
    if (!hierarchyGuidesEnabled) {
      return visibleCards.map(card => ({
        card,
        depth: 0,
        originGroupLabel: '',
        parentColor: '',
      }))
    }

    const nodesByKey = new Map(
      visibleCards.map(card => [
        String(card.key),
        {
          card,
          children: [],
        },
      ]),
    )
    const rootNodes = []

    nodesByKey.forEach(node => {
      const parentNode = node.card.parentCardKey
        ? nodesByKey.get(String(node.card.parentCardKey))
        : null

      if (parentNode && parentNode !== node) {
        parentNode.children.push(node)
        return
      }

      rootNodes.push(node)
    })

    const entries = []
    const appendNode = (
      node,
      depth = 0,
      parentColor = '',
      originGroupLabel = '',
    ) => {
      entries.push({
        card: node.card,
        depth,
        originGroupLabel,
        parentColor,
      })

      const renderedGroupKeys = new Set()
      node.children.forEach(childNode => {
        const groupKey = String(
          childNode.card?.originGroup?.key || childNode.card?.key || '',
        )
        const shouldRenderGroupLabel = !renderedGroupKeys.has(groupKey)
        renderedGroupKeys.add(groupKey)

        appendNode(
          childNode,
          depth + 1,
          node.card.itemColor,
          shouldRenderGroupLabel
            ? childNode.card?.originGroup?.label || ''
            : '',
        )
      })
    }

    rootNodes.forEach(node => appendNode(node))

    return entries
  }, [hierarchyGuidesEnabled, visibleCards])

  const renderGroups = (groups, card, depth = 0) => {
    if (!Array.isArray(groups) || groups.length === 0) {
      return null
    }

    const nestedStyle = depth > 0 && hierarchyGuidesEnabled
      ? {
          marginLeft: 24,
          marginTop: 6,
          paddingLeft: 12,
          borderLeftWidth: 1,
          borderLeftColor: '#CBD5E1',
        }
      : depth > 0
        ? {
            marginLeft: 0,
            marginTop: 6,
            paddingLeft: 0,
            borderLeftWidth: 0,
          }
      : null

    return (
      <View
        style={[
          groupWrapperStyle,
          nestedStyle,
        ]}
      >
        {groups.map(group => (
          <View
            key={`${card.key}-${depth}-${group.id}`}
            style={groupWrapperStyle}
          >
            {!!group.label && (
              <View style={[
                styles.groupTitlePill,
                compactEnabled && sharedStyles.compactGroupTitlePill,
              ]}>
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
              const hasGroupItemMeta =
                (showDescriptions && !!groupItem.description) ||
                (showDetails && !!groupItem.observation)

              return (
                <View
                  key={groupItem.id}
                  style={[
                    styles.groupItem,
                    compactEnabled && sharedStyles.compactGroupItem,
                  ]}
                >
                  <View style={[sharedStyles.groupItemMainRow, styles.groupItemMainRow]}>
                    <View style={[sharedStyles.groupItemContent, styles.groupItemContent]}>
                      <View style={[
                        sharedStyles.groupItemTitleRow,
                        styles.groupItemTitleRow,
                      ]}>
                        <Text style={[
                          sharedStyles.groupItemTitleText,
                          styles.groupItemText,
                        ]}>
                          {showGroupStatusMarker ? (
                            <Text style={[styles.statusMarker, { color: childColor }]}>* </Text>
                          ) : null}
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

                        {showQueuePresentation ? (
                          <QueueBadge
                            presentation={groupItem.queuePresentation}
                            styles={styles}
                          />
                        ) : null}
                      </View>

                      {hasGroupItemMeta ? (
                        <View style={[
                          sharedStyles.groupItemMetaWrap,
                          styles.groupItemMetaWrap,
                          compactEnabled && sharedStyles.compactMetaWrap,
                        ]}>
                          {showDescriptions && !!groupItem.description && (
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
                      ) : null}

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
      {visibleCardEntries.map(({
        card,
        depth,
        originGroupLabel,
        parentColor,
      }, index) => {
        const rootItem = card.rootItem || {}
        const hasRootItem = Object.keys(rootItem).length > 0
        const isRootZero = hasRootItem && Number(rootItem?.quantity || 0) === 0
        const startsNewRootFamily = compactEnabled && depth === 0 && index > 0
        const hasIndependentChildren = visibleCards.some(
          childCard =>
            String(childCard?.parentCardKey || '') === String(card?.key || ''),
        )
        const itemColor = isRootZero ? REMOVAL_COLOR : (card.itemColor || order?.status?.color)
        const cardImageUrl = showImages ? resolveCardImageUrl(card) : ''
        const hasRootMeta =
          (showDescriptions && !!card.description) ||
          (showDetails && !!card.observation) ||
          (showPricing && card.unitPrice > 0)
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
          <View
            key={card.key || `card-${index}`}
            style={[
              startsNewRootFamily && sharedStyles.compactRootFamilySeparator,
              startsNewRootFamily && styles.rootFamilySeparator,
              depth > 0 && [
                sharedStyles.independentChildrenWrap,
                styles.independentChildrenWrap,
                compactEnabled && sharedStyles.compactIndependentChildrenWrap,
                {
                  marginLeft: depth * (compactEnabled ? 12 : 18),
                  borderLeftColor: compactEnabled && hierarchyGuideColor
                    ? withOpacity(hierarchyGuideColor, 0.8)
                    : withOpacity(parentColor || itemColor, 0.28),
                },
              ],
            ]}
          >
            {!!originGroupLabel && (
              <View style={[
                sharedStyles.independentChildGroup,
                styles.independentChildGroup,
                compactEnabled && sharedStyles.compactIndependentChildGroup,
                styles.groupTitlePill,
                compactEnabled && sharedStyles.compactGroupTitlePill,
              ]}>
                <Text style={styles.groupTitle}>{originGroupLabel}</Text>
              </View>
            )}
            <View
              style={[
                styles.itemRow,
                compactEnabled && sharedStyles.compactItemRow,
                compactEnabled &&
                  depth === 0 &&
                  hasIndependentChildren &&
                  sharedStyles.compactParentWithChildrenRow,
                compactEnabled && depth > 0 && sharedStyles.compactOperationalChildRow,
                hierarchyGuidesEnabled
                  ? {
                      borderLeftWidth: 3,
                      borderLeftColor: itemColor,
                    }
                  : {
                      borderLeftWidth: 0,
                      paddingLeft: 0,
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

                  {compactEnabled && showRootQuantityPrefix ? (
                    <Text style={[
                      sharedStyles.compactQuantityColumn,
                      styles.qtyText,
                    ]}>
                      {isRootZero
                        ? ''
                        : `${normalizeOrderProductQuantity(card.quantity)}x`}
                    </Text>
                  ) : null}

                  <View style={[sharedStyles.itemContent, styles.itemContent]}>
                    <View style={[
                      sharedStyles.itemTitleRow,
                      styles.itemTitleRow,
                    ]}>
                      <Text
                        style={[sharedStyles.itemTitleText, styles.text]}
                        numberOfLines={2}
                      >
                        {showRootStatusMarker ? (
                          <Text style={[styles.statusMarker, { color: itemColor }]}>* </Text>
                        ) : null}
                        {isRootZero ? (
                          <Text style={{ color: REMOVAL_COLOR, fontWeight: 'bold' }}>REMOVER </Text>
                        ) : null}
                        {!compactEnabled && showRootQuantityPrefix && !isRootZero ? (
                          <Text style={styles.qtyText}>{normalizeOrderProductQuantity(card.quantity)}x </Text>
                        ) : null}
                        {card.name || `Item #${index + 1}`}
                      </Text>

                      {showQueuePresentation ? (
                        <QueueBadge presentation={card.queuePresentation} styles={styles} />
                      ) : null}
                    </View>

                    {hasRootMeta ? (
                      <View style={[
                        sharedStyles.metaWrap,
                        styles.metaWrap,
                        compactEnabled && sharedStyles.compactMetaWrap,
                      ]}>
                        {showDescriptions && !!card.description && (
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
                    ) : null}
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
