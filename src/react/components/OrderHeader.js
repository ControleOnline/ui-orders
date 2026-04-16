import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Image, StyleSheet, Animated } from 'react-native'
import Formatter from '@controleonline/ui-common/src/utils/formatter'
import { getOrderChannelLabel, getOrderChannelLogo } from '@assets/ppc/channels'
import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton';

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

const OrderHeader = ({ order, compact = false, showCustomer = false, palette = null }) => {
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
      <View style={styles.topRow}>
        <View style={styles.leftInfo}>
          <Image source={BRAND_LOGO} style={styles.brandLogo} resizeMode="contain" />
          <View>
            <Text style={styles.orderId}>{global.t?.t('orders', 'title', 'order')} #{order?.id}</Text>
            <View style={styles.timeRow}>
              <Text style={styles.orderTime}>
                {Formatter.formatDateYmdTodmY(orderDateValue, true)}
              </Text>

              {isOpen && (
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
              )}
            </View>
          </View>
        </View>

        <View style={styles.rightInfo}>
          <View style={[styles.statusBadge, { borderColor: statusColor }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.statusText}>
              {displayedStatus.label}
            </Text>
          </View>
          <Text style={styles.orderPrice}>
            {Formatter.formatMoney(displayPrice)}
          </Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.channelWrap}>
          {channelLogo && (
            <Image source={channelLogo} style={styles.channelLogo} resizeMode="contain" />
          )}
          <Text style={styles.channelText}>
            {channelLabel}
          </Text>
        </View>
        {!compact && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
  )
}

const createStyles = palette =>
  StyleSheet.create({
    wrap: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.cardBg,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 10,
    },
    wrapCompact: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    leftInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    brandLogo: {
      width: 26,
      height: 26,
      marginRight: 10,
    },
    orderId: {
      color: palette.textPrimary,
      fontSize: 18,
      fontWeight: '800',
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    orderTime: {
      color: palette.textSecondary,
      fontSize: 13,
    },
    waitingTime: {
      fontSize: 13,
      fontWeight: '800',
    },
    rightInfo: {
      alignItems: 'flex-end',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 3,
      backgroundColor: palette.panelBg,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      marginRight: 6,
    },
    statusText: {
      color: palette.textPrimary,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    orderPrice: {
      color: palette.accent,
      fontSize: 16,
      fontWeight: '800',
      marginTop: 6,
    },
    bottomRow: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    channelWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      maxWidth: '52%',
    },
    channelLogo: {
      width: 22,
      height: 22,
      marginRight: 8,
      borderRadius: 4,
    },
    channelText: {
      color: palette.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    customerNameText: {
      marginTop: 6,
      color: palette.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    customerContactText: {
      marginTop: 2,
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
      gap: 4,
    },
    chipDot: {
      width: 6,
      height: 6,
      borderRadius: 999,
    },
    chipText: {
      fontSize: 11,
      fontWeight: '700',
    },
  })

export default OrderHeader
