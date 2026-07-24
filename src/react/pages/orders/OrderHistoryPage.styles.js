import { Platform, StyleSheet } from 'react-native';

const pickColor = (...values) =>
  values.find(value => typeof value === 'string' && value.trim() !== '') || '';

const createStyles = palette => StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 18,
  },
  filtersCard: { backgroundColor: palette.cardBackground, borderRadius: 14, padding: 10, marginBottom: 8 },
  filtersHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  filtersTitle: { fontSize: 15, fontWeight: '700', color: palette.textPrimary },
  filterSelectorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    marginHorizontal: -4,
    marginBottom: -8,
  },
  filterSelectorSlot: {
    minWidth: 0,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  filterSelectorSlotThird: {
    width: '33.3333%',
  },
  filterSelectorSlotHalf: {
    width: '50%',
  },
  filterSelectorSlotFull: {
    width: '100%',
  },

  centerState: { backgroundColor: palette.cardBackground, borderRadius: 20, padding: 24, alignItems: 'center', gap: 10, marginBottom: 10 },
  centerStateTitle: { fontSize: 18, fontWeight: '700', color: palette.textPrimary, textAlign: 'center' },
  centerStateText: { fontSize: 14, color: palette.textSecondary, textAlign: 'center', lineHeight: 20 },

  tableWrap: {
    flex: 1,
    minHeight: 0,
  },

  orderCard: {
    backgroundColor: palette.cardBackground,
    borderWidth: palette.cardBorder ? 1 : 0,
    borderColor: palette.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: palette.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  cardMetaRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: palette.dividerBorder,
  },
  channelText: { fontSize: 13, fontWeight: '600', color: palette.textSecondary, flex: 1 },
  rowActionButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

});

export const createModalStyles = themeColors => {
  const background = pickColor(themeColors.modalBackground, themeColors.cardBackground, '#FFFFFF');
  const border = pickColor(themeColors.cardBorder, themeColors.border, '#E2E8F0');
  const textPrimary = pickColor(themeColors.textPrimary, themeColors['text-primary'], '#0F172A');
  const textSecondary = pickColor(themeColors.textSecondary, themeColors['text-secondary'], '#64748B');
  const buttonText = pickColor(themeColors.buttonText, '#FFFFFF');
  const danger = pickColor(themeColors.danger, themeColors.textDanger, '#DC2626');
  const muted = pickColor(themeColors.textMuted, textSecondary);

  return {
    ...StyleSheet.create({
      modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.42)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      },
      modalSheet: {
        width: '100%',
        maxWidth: 720,
        maxHeight: '88%',
        minHeight: 280,
        backgroundColor: background,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: border,
        overflow: 'hidden',
        ...Platform.select({
          web: { boxShadow: '0 20px 48px rgba(15, 23, 42, 0.18)' },
          default: {},
        }),
      },
      modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: border,
      },
      modalTitle: {
        flex: 1,
        minWidth: 0,
        color: textPrimary,
        fontSize: 16,
        fontWeight: '800',
      },
      modalIconButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: border,
      },
      tableArea: {
        flex: 1,
        minHeight: 260,
        padding: 10,
      },
      inlineForm: {
        borderBottomWidth: 1,
        borderBottomColor: border,
      },
      cancelBody: {
        padding: 14,
        gap: 10,
      },
      cancelInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      },
      cancelInfoLabel: {
        color: textSecondary,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
      },
      cancelInfoValue: {
        flex: 1,
        minWidth: 0,
        color: textPrimary,
        fontSize: 14,
        fontWeight: '800',
        textAlign: 'right',
      },
      cancelReasonsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        marginTop: 4,
      },
      cancelSectionTitle: {
        color: textPrimary,
        fontSize: 14,
        fontWeight: '800',
      },
      manageReasonsButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: border,
        alignItems: 'center',
        justifyContent: 'center',
      },
      reasonList: {
        maxHeight: 260,
      },
      reasonRow: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 9,
        marginBottom: 8,
      },
      reasonText: {
        flex: 1,
        minWidth: 0,
        color: textPrimary,
        fontSize: 14,
        fontWeight: '700',
      },
      reasonInput: {
        minHeight: 78,
        borderWidth: 1,
        borderColor: border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: textPrimary,
        textAlignVertical: 'top',
      },
      emptyText: {
        color: textSecondary,
        fontSize: 13,
        fontWeight: '600',
        paddingVertical: 12,
      },
      modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        padding: 14,
        borderTopWidth: 1,
        borderTopColor: border,
      },
      secondaryButton: {
        minHeight: 38,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: border,
        alignItems: 'center',
        justifyContent: 'center',
      },
      secondaryButtonText: {
        color: textPrimary,
        fontSize: 13,
        fontWeight: '800',
      },
      dangerButton: {
        minHeight: 38,
        paddingHorizontal: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
      },
      dangerButtonText: {
        color: buttonText,
        fontSize: 13,
        fontWeight: '800',
      },
      disabledButton: {
        opacity: 0.55,
      },
    }),
    tokens: {
      danger,
      iconMuted: muted,
      placeholder: muted,
    },
  };
};

export default createStyles;
