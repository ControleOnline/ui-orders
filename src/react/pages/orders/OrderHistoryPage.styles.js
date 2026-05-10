import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
  },
  filtersCard: { backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 10 },
  filtersHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  filtersTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  filterSelectorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  centerState: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', gap: 10, marginBottom: 10 },
  centerStateTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  centerStateText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },

  tableWrap: {
    flex: 1,
    minHeight: 0,
  },

  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  cardMetaRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  channelText: { fontSize: 13, fontWeight: '600', color: '#475569', flex: 1 },

});

export default styles;
