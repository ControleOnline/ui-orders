import {StyleSheet} from 'react-native'

const createStyles = isKds =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      minWidth: 0,
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
    orderId: {
      color: '#0F172A',
      fontSize: isKds ? 18 : 15,
      fontWeight: '800',
    },
    orderIdSecondary: {
      marginTop: 1,
      color: '#475569',
      fontSize: 12,
      fontWeight: '700',
    },
    orderDate: {
      color: '#64748B',
      fontSize: 12,
      flexShrink: 1,
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
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      gap: 5,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    priceText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#16A34A',
      marginTop: 8,
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
    metaChipText: {
      color: '#475569',
      fontSize: 10,
      fontWeight: '800',
      lineHeight: 12,
      flexShrink: 1,
    },
  })

export default createStyles
