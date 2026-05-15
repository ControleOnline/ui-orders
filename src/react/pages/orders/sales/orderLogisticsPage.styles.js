import {StyleSheet} from 'react-native';

const createStyles = palette =>
  StyleSheet.create({
    pageRoot: {
      flex: 1,
      backgroundColor: palette?.pageBg || '#F8FAFC',
    },
    pageScrollContent: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 24,
      gap: 12,
    },
    heroCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette?.borderSoft || '#D6E4F0',
      backgroundColor: palette?.cardBg || '#FFFFFF',
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 8,
    },
    heroTitle: {
      color: palette?.textPrimary || '#0F172A',
      fontSize: 18,
      fontWeight: '900',
    },
    heroSubtitle: {
      color: palette?.textSecondary || '#475569',
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 16,
    },
    statusPill: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette?.borderSoft || '#D6E4F0',
      backgroundColor: palette?.cardBgSoft || '#EEF7FF',
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    statusPillText: {
      color: palette?.accentInfo || '#0284C7',
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0.2,
      textTransform: 'uppercase',
    },
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    actionButton: {
      minHeight: 42,
      paddingHorizontal: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      borderWidth: 1,
      borderColor: palette?.borderSoft || '#D6E4F0',
      backgroundColor: palette?.cardBg || '#FFFFFF',
    },
    actionButtonPrimary: {
      backgroundColor: palette?.accentInfo || '#0284C7',
      borderColor: palette?.accentInfo || '#0284C7',
    },
    actionButtonDisabled: {
      opacity: 0.55,
    },
    actionButtonText: {
      color: palette?.textPrimary || '#0F172A',
      fontSize: 12,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.25,
    },
    actionButtonTextPrimary: {
      color: '#FFFFFF',
    },
    sectionGap: {
      gap: 10,
    },
  });

export default createStyles;
