import { StyleSheet } from 'react-native';

const withAlpha = (color, alphaHex) => {
  const raw = String(color || '').trim().replace('#', '');
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw}${alphaHex}`;
  }

  if (/^[0-9a-fA-F]{8}$/.test(raw)) {
    return `#${raw.slice(0, 6)}${alphaHex}`;
  }

  return color;
};

const createStyles = ({
  primaryColor,
  dangerColor,
  successColor,
  compact = false,
  ultraCompact = false,
}) =>
  StyleSheet.create({
    toolbarWrap: {
      position: 'absolute',
      left: compact ? 8 : 10,
      right: compact ? 8 : 10,
      alignItems: compact ? 'stretch' : 'center',
      zIndex: 12,
    },
    badge: {
      minHeight: compact ? 30 : 34,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: compact ? 10 : 12,
      paddingVertical: compact ? 5 : 6,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'center',
      gap: compact ? 4 : 6,
      shadowColor: '#0F172A',
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: {width: 0, height: 4},
      elevation: 3,
      backgroundColor: withAlpha(primaryColor, '10'),
      borderColor: withAlpha(primaryColor, '30'),
      maxWidth: '100%',
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
      fontSize: ultraCompact ? 11 : 12,
      fontWeight: '800',
      textAlign: 'center',
      flexShrink: 1,
    },
  });

export default createStyles;

export const inlineStyle_125_12 = {
  paddingVertical: 6,
};
