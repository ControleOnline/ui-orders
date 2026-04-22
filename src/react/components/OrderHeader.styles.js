import { StyleSheet } from 'react-native'

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
    orderIdentityWrap: {
      minWidth: 0,
    },
    orderIdSecondary: {
      marginTop: 1,
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: '700',
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

export default createStyles

export const inlineStyle_217_16 = {
  flexDirection: 'row',
  alignItems: 'center',
};
