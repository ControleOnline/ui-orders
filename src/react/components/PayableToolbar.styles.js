import { StyleSheet } from 'react-native';

const withAlpha = (color, alphaHex) => {
  const raw = String(color || '').trim().replace('#', '');
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw}${alphaHex}`;
  }

  if (/^[0-9a-fA-F]{8}$/.test(raw)) {
    return `#${raw.slice(0, 6)}${alphaHex}`;
  }

  return color || '#1B5587';
};

const createStyles = ({primaryColor, dangerColor, successColor}) =>
  StyleSheet.create({
    toolbarWrap: {
      position: 'absolute',
      left: 10,
      right: 10,
      alignItems: 'center',
      zIndex: 12,
    },
    badge: {
      minHeight: 34,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      shadowColor: '#0F172A',
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: {width: 0, height: 4},
      elevation: 3,
      backgroundColor: withAlpha(primaryColor, '10'),
      borderColor: withAlpha(primaryColor, '30'),
    },
    badgeDanger: {
      backgroundColor: withAlpha(dangerColor, '12'),
      borderColor: withAlpha(dangerColor, '55'),
    },
    badgeSuccess: {
      backgroundColor: withAlpha(successColor, '10'),
      borderColor: withAlpha(successColor, '45'),
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '800',
      textAlign: 'center',
    },
  });

export default createStyles;

export const inlineStyle_125_12 = {
  paddingVertical: 6,
};

