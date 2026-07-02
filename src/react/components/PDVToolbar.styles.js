import { Platform, StyleSheet } from 'react-native';

const createStyles = (colors, insets) =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      elevation: 1000,
    },
    wrapper: {
      paddingBottom: Math.max(insets?.bottom || 0, 8),
      paddingTop: 0,
      backgroundColor: 'transparent',
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 64,
      paddingHorizontal: 8,
      paddingTop: 8,
      paddingBottom: 8,
      borderWidth: 1,
      borderColor: colors?.border || '#D7E1EC',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderBottomWidth: 0,
      backgroundColor: colors?.background || '#FFFFFF',
      overflow: 'hidden',
      ...(Platform.OS === 'android'
        ? { elevation: 10 }
        : {
            shadowColor: '#0F172A',
            shadowOpacity: 0.12,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: -6 },
          }),
    },
    button: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 44,
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
    buttonText: {
      fontSize: 12,
      color: colors?.textSecondary || '#666',
      marginTop: 6,
      textAlign: 'center',
    },
    activeText: {
      color: colors?.primary,
      fontWeight: '800',
    },
  });

export default createStyles;
