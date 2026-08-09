import React, { useMemo } from 'react'
import { Image, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { withOpacity } from '@controleonline/../../src/styles/branding'
import { resolveFileImageUrl } from '@controleonline/ui-common/src/react/utils/fileUrl'
import Formatter from '@controleonline/ui-common/src/utils/formatter'

import sharedStyles from './OrderProducts.styles'
import {
  buildOrderProductCards,
  getOrderProductFiles,
  isOperationalOrderProductCardChecked,
  isOrderProductChecked,
  normalizeOrderProductQuantity,
} from './OrderProducts.utils'

const REMOVAL_COLOR = '#c10015'
const ADDITION_COLOR = '#059669'
const NEUTRAL_COLOR = '#64748B'

const semanticIconByType = {
  addition: 'plus',
  removal: 'minus',
}

import {
  resolveOrderProductImageSize,
  resolveOrderProductHierarchyIndent,
} from './orderProductHierarchyUi'

export {
  resolveOrderProductImageSize,
  resolveOrderProductHierarchyIndent,
} from './orderProductHierarchyUi'

const QueueIdentifier = ({ presentation, mode, styles }) => {
  const queue = presentation?.queue?.queue || null
  if (!queue || mode === 'none') return null

  if (mode === 'icon') {
    if (!queue?.icon) return null
    return (
      <MaterialCommunityIcons
        name={queue.icon}
        size={15}
        color={presentation.color || NEUTRAL_COLOR}
        style={styles?.queueIdentifierIcon}
      />
    )
  }

  const label = mode === 'short_label'
    ? String(queue?.shortLabel || '').trim()
    : String(queue?.queue || queue?.name || '').trim()

  if (!label) return null
  return <Text style={[sharedStyles.queueIdentifierText, styles?.queueIdentifierText]}>{label}</Text>
}

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
  queueIdentificationMode = 'none',
  statusIndicatorMode = null,
  showUnitQuantity = false,
  showGroupNames = true,
  showConferenceCheck = false,
  compactTree = false,
  hierarchySurfaceColor = '#FFFFFF',
}) => {
  const hierarchyGuidesEnabled = Boolean(showHierarchyGuides)
  const compactEnabled = Boolean(compact)
  const compactTreeEnabled = Boolean(compactTree)
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

  const visibleCardFamilies = useMemo(() => {
    if (!compactTreeEnabled) {
      return visibleCardEntries.map(entry => [entry])
    }

    return visibleCardEntries.reduce((families, entry) => {
      if (entry.depth === 0 || families.length === 0) {
        families.push([entry])
      } else {
        families[families.length - 1].push(entry)
      }

      return families
    }, [])
  }, [compactTreeEnabled, visibleCardEntries])

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
          nestedStyle,
        ]}
      >
        {groups.map(group => (
          <View
            key={`${card.key}-${depth}-${group.id}`}
            style={[
              groupWrapperStyle,
              compactEnabled && depth === 0 && sharedStyles.compactRootGroupWrap,
              compactTreeEnabled && sharedStyles.compactTreeGroupWrap,
            ]}
          >
            {showGroupNames && !compactTreeEnabled && !!group.label && (
              <View style={[
                styles.groupTitlePill,
                compactEnabled && sharedStyles.compactGroupTitlePill,
              ]}>
                <Text style={styles.groupTitle}>{group.label}</Text>
              </View>
            )}

            {group.items.map(groupItem => {
              const childColor = groupItem.isZero ? REMOVAL_COLOR : groupItem.itemColor
              const semanticIcon = semanticIconByType[group.customizationType]
              const isGroupItemChecked = showConferenceCheck &&
                isOrderProductChecked(groupItem.orderProduct)
              const childActions = compactTreeEnabled
                ? null
                : renderEntryActions({
                    renderActions,
                    entryType: 'group',
                    card,
                    group,
                    entry: groupItem,
                  })
              const hasGroupItemMeta =
                !compactTreeEnabled &&
                (
                  (showDescriptions && !!groupItem.description) ||
                  (showDetails && !!groupItem.observation)
                )

              return (
                <View
                  key={groupItem.id}
                  style={[
                    styles.groupItem,
                    compactEnabled && sharedStyles.compactGroupItem,
                    compactTreeEnabled && sharedStyles.compactTreeGroupItem,
                  ]}
                >
                  <View style={[sharedStyles.groupItemMainRow, styles.groupItemMainRow]}>
                    <View style={[sharedStyles.groupItemContent, styles.groupItemContent]}>
                      <View style={[
                        sharedStyles.groupItemTitleRow,
                        styles.groupItemTitleRow,
                      ]}>
                        {semanticIcon ? (
                          <MaterialCommunityIcons
                            name={semanticIcon}
                            size={13}
                            color={group.customizationType === 'removal'
                              ? REMOVAL_COLOR
                              : ADDITION_COLOR}
                            style={sharedStyles.semanticMarker}
                          />
                        ) : (
                          <View style={sharedStyles.semanticMarker} />
                        )}
                        <Text style={[
                          sharedStyles.groupItemTitleText,
                          styles.groupItemText,
                        ]}>
                          {showGroupStatusMarker && !compactTreeEnabled && !statusIndicatorMode ? (
                            <Text style={[styles.statusMarker, { color: childColor }]}>* </Text>
                          ) : null}
                          {isGroupItemChecked ? (
                            <Text style={[
                              sharedStyles.conferenceCheck,
                              styles.conferenceCheck,
                              { color: groupItem.orderProduct?.status?.color || ADDITION_COLOR },
                            ]}>✓ </Text>
                          ) : null}
                          {groupItem.isZero && !compactTreeEnabled ? (
                            <Text style={{ color: REMOVAL_COLOR, fontWeight: 'bold' }}>REMOVER </Text>
                          ) : null}
                          {!compactTreeEnabled && !groupItem.isZero && (
                            normalizeOrderProductQuantity(groupItem.quantity) > 1 ||
                            (group.showUnitQuantity ?? showUnitQuantity)
                          ) ? (
                            <Text style={styles.qtyText}>
                              {`${normalizeOrderProductQuantity(groupItem.quantity)}x `}
                            </Text>
                          ) : null}
                          {groupItem.name}
                        </Text>

                        {showQueuePresentation ? (
                          compactEnabled ? (
                            <QueueIdentifier presentation={groupItem.queuePresentation} mode={queueIdentificationMode} styles={styles} />
                          ) : (
                            <QueueBadge presentation={groupItem.queuePresentation} styles={styles} />
                          )
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

                    {(childActions || (showPricing && groupItem.totalPrice > 0)) ? (
                      <View style={sharedStyles.groupItemTrailingRow}>
                        {showPricing && groupItem.totalPrice > 0 ? (
                          <Text style={styles.groupItemPriceText}>
                            {Formatter.formatMoney(groupItem.totalPrice)}
                          </Text>
                        ) : null}
                        {childActions ? (
                          <View style={[
                            sharedStyles.groupItemActions,
                            styles.groupItemActions,
                          ]}>
                            {childActions}
                          </View>
                        ) : null}
                      </View>
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
      {visibleCardFamilies.map((familyEntries, familyIndex) => {
        const familyRootCard = familyEntries[0]?.card || {}
        const familyColor = hierarchyGuideColor ||
          familyRootCard.itemColor ||
          order?.status?.color ||
          NEUTRAL_COLOR

        return (
          <View
            key={`family-${familyRootCard.key || familyIndex}`}
            style={[
              compactTreeEnabled && sharedStyles.compactTreeFamily,
              compactTreeEnabled && styles.compactTreeFamily,
              compactTreeEnabled && {
                backgroundColor: withOpacity(familyColor, 0.08),
                borderColor: withOpacity(familyColor, 0.2),
              },
              compactEnabled && familyIndex > 0 && sharedStyles.compactRootFamilySeparator,
              compactEnabled && familyIndex > 0 && styles.rootFamilySeparator,
            ]}
          >
            {familyEntries.map(({
              card,
              depth,
              originGroupLabel,
              parentColor,
            }, index) => {
        const rootItem = card.rootItem || {}
        const hasRootItem = Object.keys(rootItem).length > 0
        const isRootZero = hasRootItem && Number(rootItem?.quantity || 0) === 0
        const hasIndependentChildren = visibleCards.some(
          childCard =>
            String(childCard?.parentCardKey || '') === String(card?.key || ''),
        )
        const itemColor = isRootZero ? REMOVAL_COLOR : (card.itemColor || order?.status?.color)
        const hasOperationalQueue = Boolean(card.queuePresentation)
        const rootQuantity = normalizeOrderProductQuantity(card.quantity)
        const shouldShowRootQuantity =
          showRootQuantityPrefix &&
          !isRootZero &&
          (rootQuantity > 1 || showUnitQuantity)
        const isRootChecked = showConferenceCheck &&
          isOperationalOrderProductCardChecked(card)
        const cardImageUrl = showImages ? resolveCardImageUrl(card) : ''
        const imageSize = resolveOrderProductImageSize(depth, compactTreeEnabled)
        const shouldShowImageQuantity =
          compactTreeEnabled &&
          showImages &&
          showRootQuantityPrefix &&
          !isRootZero
        const shouldShowRootPricing =
          showPricing &&
          card.unitPrice > 0 &&
          (!compactTreeEnabled || depth === 0)
        const shouldShowCompactChildPrice =
          compactTreeEnabled &&
          depth > 0 &&
          showPricing &&
          card.totalPrice > 0
        const hasRootMeta =
          (showDescriptions && !!card.description) ||
          (showDetails && !!card.observation) ||
          shouldShowRootPricing
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
              compactTreeEnabled && depth === 1 && {
                backgroundColor: withOpacity(familyColor, 0.06),
              },
              compactTreeEnabled && depth > 1 && {
                backgroundColor: hierarchySurfaceColor,
              },
              depth > 0 && [
                sharedStyles.independentChildrenWrap,
                styles.independentChildrenWrap,
                compactEnabled && sharedStyles.compactIndependentChildrenWrap,
                compactTreeEnabled && sharedStyles.compactTreeIndependentChildrenWrap,
                {
                  marginLeft: resolveOrderProductHierarchyIndent(
                    depth,
                    compactEnabled,
                    compactTreeEnabled,
                  ),
                  borderLeftColor: hierarchyGuideColor
                    ? withOpacity(hierarchyGuideColor, 0.8)
                    : withOpacity(parentColor || itemColor, 0.28),
                },
              ],
            ]}
          >
            {showGroupNames && !!originGroupLabel && (
              <View style={[
                sharedStyles.independentChildGroup,
                styles.independentChildGroup,
                compactEnabled && sharedStyles.compactIndependentChildGroup,
                styles.groupTitlePill,
                compactEnabled && sharedStyles.compactGroupTitlePill,
                compactTreeEnabled && sharedStyles.compactTreeIndependentChildGroup,
              ]}>
                <Text style={[
                  styles.groupTitle,
                  compactTreeEnabled && sharedStyles.compactTreeGroupTitle,
                ]}>{originGroupLabel}</Text>
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
                depth > 0 && sharedStyles.hierarchyChildRow,
                compactTreeEnabled && sharedStyles.compactTreeItemRow,
                compactTreeEnabled && depth === 0 && sharedStyles.compactTreeRootRow,
                compactTreeEnabled && depth > 0 && sharedStyles.compactTreeChildRow,
                compactTreeEnabled && depth === 0 && {
                  backgroundColor: withOpacity(familyColor, 0.14),
                },
                compactTreeEnabled && depth > 0 && {
                  backgroundColor: 'transparent',
                },
                statusIndicatorMode === 'line' && hasOperationalQueue
                  ? {
                      borderLeftWidth: 3,
                      borderLeftColor: itemColor,
                    }
                  : statusIndicatorMode === 'line'
                  ? {
                      // Keep the line column in the layout without presenting a
                      // status for products that do not belong to a queue.
                      borderLeftWidth: 3,
                      borderLeftColor: 'transparent',
                    }
                  : null,
              ]}
            >
              <View style={[
                sharedStyles.itemMainRow,
                styles.itemMainRow,
                compactTreeEnabled && sharedStyles.compactTreeMainRow,
              ]}>
                <View style={[
                  sharedStyles.itemLead,
                  styles.itemLead,
                  compactTreeEnabled && sharedStyles.compactTreeLead,
                ]}>
                  {statusIndicatorMode === 'bullet' && hasOperationalQueue ? (
                    <View style={[sharedStyles.statusBullet, { backgroundColor: itemColor }]} />
                  ) : statusIndicatorMode === 'bullet' ? (
                    <View style={sharedStyles.statusBulletSpacer} />
                  ) : null}
                  {showImages ? (
                    <View
                      accessibilityLabel={`Imagem de ${card.name || 'item'}`}
                      style={[
                        sharedStyles.itemThumbWrap,
                        styles.itemThumbWrap,
                        {
                          width: imageSize,
                          height: imageSize,
                          borderRadius: Math.max(8, Math.round(imageSize * 0.21)),
                        },
                      ]}>
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
                              {fontSize: depth > 0 ? 14 : 18},
                            ]}
                          >
                            {resolveCardInitial(card)}
                          </Text>
                        </View>
                      )}
                      {shouldShowImageQuantity ? (
                        <View
                          accessibilityLabel={`Quantidade ${rootQuantity} de ${card.name || 'item'}`}
                          style={[
                            sharedStyles.imageQuantityBadge,
                            depth > 0 && sharedStyles.imageQuantityBadgeChild,
                          ]}>
                          <Text style={[
                            sharedStyles.imageQuantityBadgeText,
                            depth > 0 && sharedStyles.imageQuantityBadgeTextChild,
                          ]}>
                            {rootQuantity}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={[sharedStyles.itemContent, styles.itemContent]}>
                    <View style={[
                      sharedStyles.itemTitleRow,
                      styles.itemTitleRow,
                    ]}>
                      {compactEnabled && !compactTreeEnabled && showRootQuantityPrefix ? (
                        <Text style={[
                          styles.qtyText,
                          sharedStyles.compactQuantityColumn,
                        ]}>
                          {shouldShowRootQuantity ? `${rootQuantity}x ` : ''}
                        </Text>
                      ) : null}
                      <Text
                        style={[
                          sharedStyles.itemTitleText,
                          styles.text,
                          compactTreeEnabled && sharedStyles.compactTreeTitle,
                          compactTreeEnabled && depth > 0 && sharedStyles.compactTreeChildTitle,
                        ]}
                        numberOfLines={
                          compactTreeEnabled && depth > 0 ? 1 : 2
                        }
                      >
                        {showRootStatusMarker && !compactTreeEnabled && !statusIndicatorMode ? (
                          <Text style={[styles.statusMarker, { color: itemColor }]}>* </Text>
                        ) : null}
                        {isRootChecked ? (
                          <Text style={[
                            sharedStyles.conferenceCheck,
                            styles.conferenceCheck,
                            { color: rootItem?.status?.color || ADDITION_COLOR },
                          ]}>✓ </Text>
                        ) : null}
                        {isRootZero ? (
                          <Text style={{ color: REMOVAL_COLOR, fontWeight: 'bold' }}>REMOVER </Text>
                        ) : null}
                        {!compactEnabled && !compactTreeEnabled && shouldShowRootQuantity ? (
                          <Text style={styles.qtyText}>{rootQuantity}x </Text>
                        ) : null}
                        {card.name || `Item #${index + 1}`}
                      </Text>

                      {showQueuePresentation ? (
                        compactEnabled ? (
                          <QueueIdentifier presentation={card.queuePresentation} mode={queueIdentificationMode} styles={styles} />
                        ) : (
                          <QueueBadge presentation={card.queuePresentation} styles={styles} />
                        )
                      ) : null}
                    </View>

                    {hasRootMeta ? (
                      <View style={[
                        sharedStyles.metaWrap,
                        styles.metaWrap,
                        compactEnabled && sharedStyles.compactMetaWrap,
                        compactTreeEnabled && sharedStyles.compactTreeMetaWrap,
                      ]}>
                        {showDescriptions && !!card.description && (
                          <Text
                            style={[
                              styles.subText,
                              compactTreeEnabled && sharedStyles.compactTreeMetaText,
                            ]}
                            numberOfLines={compactTreeEnabled ? 1 : 2}>
                            {card.description}
                          </Text>
                        )}

                        {showDetails && !!card.observation && (
                          <Text
                            style={[
                              styles.subText,
                              compactTreeEnabled && sharedStyles.compactTreeMetaText,
                            ]}
                            numberOfLines={compactTreeEnabled ? 1 : 2}>
                            Obs: {card.observation}
                          </Text>
                        )}

                        {shouldShowRootPricing && (
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

                {(shouldShowCompactChildPrice || rootActions) ? (
                  <View style={[
                    sharedStyles.compactTreeTrailingRow,
                    sharedStyles.itemActions,
                    styles.itemActions,
                  ]}>
                    {shouldShowCompactChildPrice ? (
                      <Text style={[
                        styles.groupItemPriceText,
                        sharedStyles.compactTreeLinePrice,
                      ]}>
                        {Formatter.formatMoney(card.totalPrice)}
                      </Text>
                    ) : null}
                    {rootActions}
                  </View>
                ) : null}
              </View>

              <View
                style={
                  compactTreeEnabled
                    ? sharedStyles.compactTreeEmbeddedGroups
                    : undefined
                }>
                {renderGroups(card.groups, card)}
              </View>
            </View>
          </View>
        )
            })}
          </View>
        )
      })}
    </>
  )
}

export default OrderProducts
