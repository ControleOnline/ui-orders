import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Image, Animated } from 'react-native'
import Formatter from '@controleonline/ui-common/src/utils/formatter'
import { getOrderChannelLabel, getOrderChannelLogo } from '@assets/ppc/channels'
import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton';
import OrderCardHeader from '@controleonline/ui-orders/src/react/components/OrderCardHeader'
import createStyles from './OrderHeader.styles'
import { inlineStyle_217_16 } from './OrderHeader.styles';
const BRAND_LOGO = require('@assets/ppc/logo 512x512 r.png')

const WAITING_RULES = [
  { max: 5, color: '#22C55E', blink: false },
  { max: 10, color: '#FACC15', blink: false },
  { max: Infinity, color: '#EF4444', blink: true },
]

const normalizeText = value => String(value || '').trim()

export const resolveDisplayedOrderStatus = (order, fallbackColor = '#6B7280') => {
  const statusLabel = normalizeText(order?.status?.status) ||
    normalizeText(order?.status?.realStatus) ||
    'open'
  const statusColor = normalizeText(order?.status?.color) || fallbackColor
  const realStatus = normalizeText(order?.status?.realStatus).toLowerCase()

  return {
    label: statusLabel,
    labelUpper: statusLabel.toUpperCase(),
    color: statusColor,
    key: statusLabel.toLowerCase(),
    isOpen: realStatus === 'open',
  }
}

const isPrivacyPlaceholder = value => {
  const normalized = normalizeText(value).toLowerCase()
  if (!normalized) return false

  return ['privacy protection', 'privacy_protection', 'privacy-protection'].includes(
    normalized,
  )
}

const getWaitingMinutes = orderDate => {
  if (!orderDate) return 0
  const diff = Date.now() - new Date(orderDate).getTime()
  return Math.max(0, Math.floor(diff / 60000))
}

const resolveOrderDateValue = order =>
  normalizeText(order?.alterDate || order?.alter_date || order?.orderDate)

const getWaitingConfig = minutes =>
  WAITING_RULES.find(rule => minutes <= rule.max)

const getCustomerName = order =>
  {
    const resolved = normalizeText(
      order?.client?.name ||
        order?.person?.name ||
        order?.customer?.name ||
        order?.customerName,
    )

    return isPrivacyPlaceholder(resolved) ? '' : resolved
  }

const getCustomerContact = order => {
  const email = Array.isArray(order?.client?.email)
    ? order?.client?.email?.[0]?.email
    : order?.client?.email

  const phoneSource = Array.isArray(order?.client?.phone)
    ? order?.client?.phone?.[0]
    : order?.client?.phone

  if (phoneSource && typeof phoneSource === 'object' && phoneSource.phone) {
    return normalizeText(
      `+${phoneSource.ddi || ''} (${phoneSource.ddd || ''}) ${phoneSource.phone}`,
    )
  }

  return normalizeText(email || phoneSource)
}

const DEFAULT_HEADER_PALETTE = {
  border: '#2A313D',
  cardBg: '#111821',
  panelBg: '#0C1219',
  textPrimary: '#F9FAFB',
  textSecondary: '#98A2B3',
  accent: '#FACC15',
}

const resolveHeaderPalette = palette => {
  if (!palette || typeof palette !== 'object') {
    return DEFAULT_HEADER_PALETTE
  }

  return {
    border: palette.border || DEFAULT_HEADER_PALETTE.border,
    cardBg: palette.cardBg || DEFAULT_HEADER_PALETTE.cardBg,
    panelBg: palette.panelBg || DEFAULT_HEADER_PALETTE.panelBg,
    textPrimary: palette.textPrimary || DEFAULT_HEADER_PALETTE.textPrimary,
    textSecondary: palette.textSecondary || DEFAULT_HEADER_PALETTE.textSecondary,
    accent: palette.accent || DEFAULT_HEADER_PALETTE.accent,
  }
}

const OrderHeader = ({
  order,
  compact = false,
  showCustomer = false,
  palette = null,
  showSecondaryIdentity = true,
}) => {
  const displayedStatus = useMemo(() => resolveDisplayedOrderStatus(order), [order])
  const isOpen = displayedStatus.isOpen
  const headerPalette = useMemo(() => resolveHeaderPalette(palette), [palette])
  const styles = useMemo(() => createStyles(headerPalette), [headerPalette])
  const orderDateValue = useMemo(() => resolveOrderDateValue(order), [order?.alterDate, order?.alter_date, order?.orderDate])

  const [waitingMinutes, setWaitingMinutes] = useState(
    getWaitingMinutes(orderDateValue),
  )

  const blinkAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!isOpen) return
    const interval = setInterval(() => {
      setWaitingMinutes(getWaitingMinutes(orderDateValue))
    }, 60000)
    return () => clearInterval(interval)
  }, [orderDateValue, isOpen])

  const waitingConfig = getWaitingConfig(waitingMinutes)

  useEffect(() => {
    if (!isOpen) {
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
  }, [waitingConfig?.blink, isOpen])

  const channelLogo = getOrderChannelLogo(order)
  const channelLabel = getOrderChannelLabel(order)
  const statusColor = displayedStatus.color
  const displayPrice = Number(order?.price || 0)
  const customerName = getCustomerName(order)
  const customerContact = getCustomerContact(order)

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <OrderCardHeader
        order={order}
        containerStyle={styles.topRow}
        leftSectionStyle={styles.leftInfo}
        leftContent={
          <Image source={BRAND_LOGO} style={styles.brandLogo} resizeMode="contain" />
        }
        identityContainerStyle={styles.orderIdentityWrap}
        primaryTextStyle={styles.orderId}
        secondaryTextStyle={styles.orderIdSecondary}
        dateRowStyle={styles.timeRow}
        dateTextStyle={styles.orderTime}
        dateText={Formatter.formatDateYmdTodmY(orderDateValue, true)}
        dateTrailingContent={
          isOpen ? (
            <Animated.Text
              style={[
                styles.waitingTime,
                {
                  color: waitingConfig?.color,
                  opacity: waitingConfig?.blink ? blinkAnim : 1,
                },
              ]}
            >
              {`  •  ${waitingMinutes} min`}
            </Animated.Text>
          ) : null
        }
        rightSectionStyle={styles.rightInfo}
        status={displayedStatus}
        statusBadgeStyle={[styles.statusBadge, { borderColor: statusColor }]}
        statusDotStyle={[styles.statusDot, { backgroundColor: statusColor }]}
        statusTextStyle={styles.statusText}
        rightContent={
          <Text style={styles.orderPrice}>
            {Formatter.formatMoney(displayPrice)}
          </Text>
        }
        showSecondaryIdentity={showSecondaryIdentity}
      />
      <View style={styles.bottomRow}>
        <View style={styles.channelWrap}>
          {channelLogo && (
            <Image source={channelLogo} style={styles.channelLogo} resizeMode="contain" />
          )}
          {!channelLogo && (
            <Text style={styles.channelText}>
              {channelLabel}
            </Text>
          )}
        </View>
        {!compact && (
          <View style={inlineStyle_217_16}>
            <PrintButton
              job={{type: 'order'}}
              store={'orders'}
              printerSelection={{enabled: true}}
            />
          </View>
        )}
      </View>
      {showCustomer && !!customerName && (
        <Text numberOfLines={1} style={styles.customerNameText}>
          {customerName}
        </Text>
      )}
      {showCustomer && !!customerContact && (
        <Text numberOfLines={1} style={styles.customerContactText}>
          {customerContact}
        </Text>
      )}
    </View>
  );
}

export default OrderHeader
