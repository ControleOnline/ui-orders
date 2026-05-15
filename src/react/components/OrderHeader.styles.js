import {StyleSheet} from 'react-native'

const createStyles = isKds =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    containerCompact: {
      alignItems: 'center',
    },
    containerStackedRightSection: {
      flexWrap: 'wrap',
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      minWidth: 0,
    },
    leftSectionCompact: {
      gap: 8,
    },
    leftSectionStackedRightSection: {
      width: '100%',
      flexShrink: 0,
    },
    leadingWrap: {
      minWidth: isKds ? 40 : 38,
      height: isKds ? 40 : 38,
      paddingHorizontal: 6,
      borderRadius: 12,
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    leadingWrapCompact: {
      minWidth: 34,
      height: 34,
      borderRadius: 11,
      paddingHorizontal: 5,
    },
    leadingWrapPurchase: {
      backgroundColor: '#FFFBEB',
      borderColor: '#FCD34D',
    },
    leadingWrapTransfer: {
      backgroundColor: '#F5F3FF',
      borderColor: '#DDD6FE',
    },
    leadingWrapLoss: {
      backgroundColor: '#FEF2F2',
      borderColor: '#FECACA',
    },
    leadingLogo: {
      width: 22,
      height: 22,
      borderRadius: 4,
    },
    leadingLabel: {
      fontSize: isKds ? 11 : 10,
      fontWeight: '800',
      color: '#0F172A',
      textTransform: 'uppercase',
    },
    titleWrap: {
      flex: 1,
      minWidth: 0,
    },
    titleWrapCompact: {
      justifyContent: 'center',
    },
    identityWrap: {
      minWidth: 0,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 1,
    },
    metaRowCompact: {
      marginTop: 0,
    },
    orderId: {
      color: '#0F172A',
      fontSize: isKds ? 18 : 15,
      fontWeight: '800',
    },
    orderIdCompact: {
      fontSize: 14,
    },
    orderIdSecondary: {
      marginTop: 1,
      color: '#475569',
      fontSize: 12,
      fontWeight: '700',
    },
    orderIdSecondaryCompact: {
      fontSize: 11,
    },
    orderDate: {
      color: '#64748B',
      fontSize: 12,
      flexShrink: 1,
    },
    orderDateCompact: {
      fontSize: 11,
    },
    customerActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: '#CBD5E1',
      backgroundColor: '#F8FAFC',
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    customerActionButtonDisabled: {
      opacity: 0.45,
    },
    customerActionText: {
      color: '#0F172A',
      fontSize: 10,
      fontWeight: '800',
    },
    rightSection: {
      alignItems: 'flex-end',
      marginLeft: 12,
      minWidth: 0,
      maxWidth: '36%',
      flexShrink: 1,
    },
    rightSectionInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      maxWidth: '48%',
    },
    rightSectionStacked: {
      width: '100%',
      maxWidth: '100%',
      marginLeft: 0,
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      flexShrink: 0,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      gap: 5,
    },
    statusBadgeCompact: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      gap: 4,
    },
    statusBadgeStacked: {
      minWidth: 0,
      flexShrink: 1,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
    },
    statusDotCompact: {
      width: 6,
      height: 6,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    statusTextCompact: {
      fontSize: 10,
    },
    priceText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#16A34A',
      marginTop: 8,
    },
    priceTextInline: {
      marginTop: 0,
      fontSize: 14,
      flexShrink: 1,
    },
    priceTextPurchase: {
      color: '#D97706',
    },
    priceTextTransfer: {
      color: '#7C3AED',
    },
    priceTextLoss: {
      color: '#DC2626',
    },
    waitingChip: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    waitingChipStacked: {
      marginTop: 0,
      flexShrink: 0,
    },
    waitingText: {
      fontSize: 12,
      fontWeight: '800',
    },
    metaChip: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: '#CBD5E1',
      backgroundColor: '#F8FAFC',
      borderRadius: 999,
      paddingHorizontal: 6,
      paddingVertical: 3,
      maxWidth: '100%',
    },
    metaChipStacked: {
      marginTop: 0,
      flexShrink: 1,
    },
    metaChipText: {
      color: '#475569',
      fontSize: 10,
      fontWeight: '800',
      lineHeight: 12,
      flexShrink: 1,
    },
  })

export default createStyles
