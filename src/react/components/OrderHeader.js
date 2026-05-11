import React, {useEffect, useMemo, useRef, useState} from 'react'
import {Animated, Image, Text, TouchableOpacity, View} from 'react-native'
import FeatherIcon from 'react-native-vector-icons/Feather'

import Formatter from '@controleonline/ui-common/src/utils/formatter'
import {withOpacity} from '@controleonline/../../src/styles/branding'
import {getOrderChannelLabel, getOrderChannelLogo} from '@assets/ppc/channels'

import OrderCardHeader from './OrderCardHeader'
import createStyles from './OrderHeader.styles'

const WAITING_RULES = [
  {max: 5, color: '#22C55E', blink: false},
  {max: 10, color: '#FACC15', blink: false},
  {max: Infinity, color: '#EF4444', blink: true},
]

const normalizeText = value => String(value || '').trim()
const resolveOrderType = order =>
  normalizeText(order?.orderType || order?.order_type).toLowerCase()
const resolveOrderCustomerLabel = order =>
  normalizeText(
    order?.client?.alias ||
      order?.client?.name ||
      order?.customer?.alias ||
      order?.customer?.name ||
      order?.customerName ||
      order?.customer_name,
  )

export const shouldShowKdsWaitingTime = order => {
  const statusValues = [
    order?.status?.realStatus,
    order?.status?.real_status,
    order?.status?.status,
  ]
    .map(value => normalizeText(value).toLowerCase())
    .filter(Boolean)

  return statusValues.some(
    value =>
      ['working', 'preparing', 'status_working'].includes(value) ||
      value.includes('prepar'),
  )
}

export const resolveDisplayedOrderStatus = (order, fallbackColor = '#6B7280') => {
  const displayLabel =
    normalizeText(order?.status?.status) ||
    normalizeText(order?.status?.realStatus) ||
    'open'
  const statusStateKey =
    normalizeText(order?.status?.realStatus) ||
    normalizeText(order?.status?.status) ||
    displayLabel
  const statusColor = normalizeText(order?.status?.color) || fallbackColor
  const statusKey = statusStateKey.toLowerCase()

  return {
    label: displayLabel,
    labelUpper: displayLabel.toUpperCase(),
    color: statusColor,
    key: statusKey,
    isOpen: statusKey === 'open',
  }
}

const getWaitingMinutes = orderDate => {
  if (!orderDate) return 0
  const diff = Date.now() - new Date(orderDate).getTime()
  return Math.max(0, Math.floor(diff / 60000))
}

const formatCompactOrderDate = value => {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')

  return `${day}/${month} ${hour}:${minute}`
}

const resolveOrderDateValue = order =>
  normalizeText(order?.alterDate || order?.alter_date || order?.orderDate || order?.order_date)

const getWaitingConfig = minutes =>
  WAITING_RULES.find(rule => minutes <= rule.max)

const resolveLeadingVisual = (order, orderType, styles) => {
  if (orderType === 'purchase') {
    return {
      wrapStyle: styles.leadingWrapPurchase,
      content: <FeatherIcon name="truck" size={16} color="#D97706" />,
    }
  }

  if (orderType === 'transfer') {
    return {
      wrapStyle: styles.leadingWrapTransfer,
      content: <FeatherIcon name="repeat" size={16} color="#7C3AED" />,
    }
  }

  if (orderType === 'loss') {
    return {
      wrapStyle: styles.leadingWrapLoss,
      content: <FeatherIcon name="trending-down" size={16} color="#DC2626" />,
    }
  }

  const channelLogo = getOrderChannelLogo(order)
  if (channelLogo) {
    return {
      wrapStyle: null,
      content: <Image source={channelLogo} style={styles.leadingLogo} resizeMode="contain" />,
    }
  }

  return {
    wrapStyle: null,
    content: (
      <Text numberOfLines={1} style={styles.leadingLabel}>
        {String(getOrderChannelLabel(order) || 'Balcao').toUpperCase()}
      </Text>
    ),
  }
}

const resolvePriceStyle = (orderType, styles) => {
  if (orderType === 'purchase') return styles.priceTextPurchase
  if (orderType === 'transfer') return styles.priceTextTransfer
  if (orderType === 'loss') return styles.priceTextLoss
  return null
}

const OrderHeader = ({
  order,
  isKds = false,
  showWaitingTime = isKds,
  stackRightSectionBelow = false,
  onCustomerPress = null,
  customerActionLabel = '',
  customerActionDisabled = false,
  metaText = '',
}) => {
  const displayedStatus = useMemo(() => resolveDisplayedOrderStatus(order), [order])
  const orderType = useMemo(() => resolveOrderType(order), [order?.orderType, order?.order_type])
  const styles = useMemo(() => createStyles(isKds), [isKds])
  const orderDateValue = useMemo(
    () => resolveOrderDateValue(order),
    [order?.alterDate, order?.alter_date, order?.orderDate, order?.order_date],
  )
  const formattedOrderDate = useMemo(
    () => formatCompactOrderDate(orderDateValue),
    [orderDateValue],
  )
  const orderCustomerLabel = useMemo(() => resolveOrderCustomerLabel(order), [order])
  const resolvedMetaText = useMemo(
    () => normalizeText(metaText) || orderCustomerLabel || formattedOrderDate,
    [formattedOrderDate, metaText, orderCustomerLabel],
  )
  const showWaitingChip = showWaitingTime && shouldShowKdsWaitingTime(order)
  const showCustomerAction =
    typeof onCustomerPress === 'function' && !!normalizeText(customerActionLabel)

  const [waitingMinutes, setWaitingMinutes] = useState(
    getWaitingMinutes(orderDateValue),
  )

  const blinkAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    setWaitingMinutes(getWaitingMinutes(orderDateValue))
  }, [orderDateValue])

  useEffect(() => {
    if (!showWaitingChip) return
    const interval = setInterval(() => {
      setWaitingMinutes(getWaitingMinutes(orderDateValue))
    }, 60000)
    return () => clearInterval(interval)
  }, [orderDateValue, showWaitingChip])

  const waitingConfig = showWaitingChip ? getWaitingConfig(waitingMinutes) : null

  useEffect(() => {
    if (!showWaitingChip) {
      blinkAnim.setValue(1)
      return
    }

    if (waitingConfig?.blink) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ).start()
    } else {
      blinkAnim.setValue(1)
    }
  }, [blinkAnim, showWaitingChip, waitingConfig?.blink])

  const leadingVisual = useMemo(
    () => resolveLeadingVisual(order, orderType, styles),
    [order, orderType, styles],
  )
  const statusColor = displayedStatus.color
  const displayPrice = Number(order?.price || 0)
  const showStatus = !['transfer', 'loss'].includes(orderType)
  const priceStyle = useMemo(() => resolvePriceStyle(orderType, styles), [orderType, styles])
  const waitingColor = waitingConfig?.color || '#EF4444'
  const shouldStackRightSectionBelow = isKds && stackRightSectionBelow

  return (
    <OrderCardHeader
      order={order}
      containerStyle={[
        styles.container,
        shouldStackRightSectionBelow && styles.containerStackedRightSection,
      ]}
      leftSectionStyle={[
        styles.leftSection,
        shouldStackRightSectionBelow && styles.leftSectionStackedRightSection,
      ]}
      leftContent={
        <View style={[styles.leadingWrap, leadingVisual.wrapStyle]}>
          {leadingVisual.content}
        </View>
      }
      identityContainerStyle={styles.identityWrap}
      titleWrapStyle={styles.titleWrap}
      primaryTextStyle={styles.orderId}
      secondaryTextStyle={styles.orderIdSecondary}
      dateRowStyle={styles.metaRow}
      dateTextStyle={styles.orderDate}
      dateText={resolvedMetaText}
      dateTrailingContent={
        showCustomerAction ? (
          <TouchableOpacity
            onPress={onCustomerPress}
            disabled={customerActionDisabled}
            style={[
              styles.customerActionButton,
              customerActionDisabled && styles.customerActionButtonDisabled,
            ]}
          >
            <FeatherIcon
              name={orderCustomerLabel ? 'refresh-cw' : 'user-plus'}
              size={11}
              color="#0F172A"
            />
            <Text style={styles.customerActionText}>{customerActionLabel}</Text>
          </TouchableOpacity>
        ) : null
      }
      rightSectionStyle={[
        styles.rightSection,
        shouldStackRightSectionBelow && styles.rightSectionStacked,
      ]}
      status={
        showStatus
          ? {label: displayedStatus.labelUpper, color: statusColor}
          : null
      }
      statusBadgeStyle={[
        styles.statusBadge,
        shouldStackRightSectionBelow && styles.statusBadgeStacked,
        {
          borderColor: withOpacity(statusColor, 0.4),
          backgroundColor: withOpacity(statusColor, 0.08),
        },
      ]}
      statusDotStyle={[styles.statusDot, {backgroundColor: statusColor}]}
      statusTextStyle={[styles.statusText, {color: statusColor}]}
      rightContent={
        showWaitingChip ? (
          <Animated.View
            style={[
              styles.waitingChip,
              shouldStackRightSectionBelow && styles.waitingChipStacked,
              {
                borderColor: withOpacity(waitingColor, 0.28),
                backgroundColor: withOpacity(waitingColor, 0.12),
                opacity: waitingConfig?.blink ? blinkAnim : 1,
              },
            ]}
          >
            <FeatherIcon name="clock" size={12} color={waitingColor} />
            <Text style={[styles.waitingText, {color: waitingColor}]}>
              {`${waitingMinutes} min`}
            </Text>
          </Animated.View>
        ) : isKds && !!formattedOrderDate ? (
          <View
            style={[
              styles.metaChip,
              shouldStackRightSectionBelow && styles.metaChipStacked,
            ]}
          >
            <FeatherIcon name="calendar" size={10} color="#475569" />
            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.metaChipText}>
              {formattedOrderDate}
            </Text>
          </View>
        ) : displayPrice > 0 ? (
          <Text style={[styles.priceText, priceStyle]}>
            {Formatter.formatMoney(displayPrice)}
          </Text>
        ) : null
      }
    />
  )
}

export default OrderHeader
