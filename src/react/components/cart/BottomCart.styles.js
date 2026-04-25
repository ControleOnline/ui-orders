import { StyleSheet } from 'react-native';

const createStyles = ({
  primaryColor,
  cardBg,
  borderColor,
  totalCardBg,
  labelColor,
  textColor,
  compact = false,
  ultraCompact = false,
}) =>
  StyleSheet.create({
    toolbar: {
      position: 'absolute',
      left: compact ? 8 : 10,
      right: compact ? 8 : 10,
      borderRadius: compact ? 14 : 16,
      borderWidth: 1,
      borderColor,
      backgroundColor: cardBg,
      flexDirection: 'row',
      alignItems: 'center',
      padding: compact ? 6 : 8,
      shadowColor: '#0F172A',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: {width: 0, height: 8},
      elevation: 6,
      gap: compact ? 6 : 8,
    },
    totalWrap: {
      flex: 1,
      minHeight: compact ? 44 : 48,
      borderRadius: compact ? 10 : 12,
      borderWidth: 1,
      borderColor,
      backgroundColor: totalCardBg,
      justifyContent: 'center',
      paddingHorizontal: compact ? 8 : 10,
    },
    totalLabel: {
      fontSize: ultraCompact ? 8 : 10,
      fontWeight: '700',
      letterSpacing: 0.2,
      textTransform: 'uppercase',
      color: labelColor,
      marginBottom: ultraCompact ? 1 : 2,
    },
    checkoutButton: {
      minHeight: compact ? 44 : 48,
      minWidth: ultraCompact ? 128 : compact ? 142 : 168,
      borderRadius: compact ? 10 : 12,
      backgroundColor: primaryColor,
      borderWidth: 1,
      borderColor: primaryColor,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: compact ? 4 : 6,
      paddingHorizontal: compact ? 12 : 14,
    },
    checkoutButtonDisabled: {
      opacity: 0.55,
    },
    checkoutButtonText: {
      color: '#FFFFFF',
      fontSize: ultraCompact ? 11 : compact ? 12 : 13,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: ultraCompact ? 0.15 : 0.35,
      flexShrink: 1,
    },
    totalText: {
      color: textColor,
    },
  });

export default createStyles;
