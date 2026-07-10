import { StyleSheet } from 'react-native';

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

});

export default createStyles;
