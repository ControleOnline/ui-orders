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
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: Math.max(insets?.bottom || 0, 8),
      backgroundColor: 'transparent',
    },
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      minHeight: 60,
      borderRadius: 18,
      backgroundColor: '#f8f8f8',
      borderTopWidth: 1,
      borderTopColor: '#ddd',
      ...(Platform.OS === 'android'
        ? { elevation: 8 }
        : {
            shadowColor: '#0F172A',
            shadowOpacity: 0.14,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: -4 },
          }),
    },
    button: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonText: {
      fontSize: 12,
      color: '#666',
      marginTop: 6,
    },
    activeText: {
      color: colors?.primary || '#007AFF',
      fontWeight: 'bold',
    },
  });

export default createStyles;
