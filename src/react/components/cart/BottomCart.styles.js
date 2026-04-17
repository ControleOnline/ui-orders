import { StyleSheet } from 'react-native';

const createStyles = ({
  primaryColor,
  cardBg,
  borderColor,
  totalCardBg,
  labelColor,
  textColor,
}) =>
  StyleSheet.create({
    toolbar: {
      position: 'absolute',
      left: 10,
      right: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor,
      backgroundColor: cardBg,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      shadowColor: '#0F172A',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: {width: 0, height: 8},
      elevation: 6,
      gap: 8,
    },
    totalWrap: {
      flex: 1,
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor,
      backgroundColor: totalCardBg,
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    totalLabel: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.2,
      textTransform: 'uppercase',
      color: labelColor,
      marginBottom: 2,
    },
    checkoutButton: {
      minHeight: 48,
      minWidth: 168,
      borderRadius: 12,
      backgroundColor: primaryColor,
      borderWidth: 1,
      borderColor: primaryColor,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 14,
    },
    checkoutButtonDisabled: {
      opacity: 0.55,
    },
    checkoutButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.35,
    },
    totalText: {
      color: textColor,
    },
  });

export default createStyles;
