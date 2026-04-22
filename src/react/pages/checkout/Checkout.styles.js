import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    color: '#000',
    elevation: 4,
    padding: 20,
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 18,
    color: '#000',
    fontWeight: '800',
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerTitleSecondary: {
    marginTop: 1,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  remoteCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  remoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  remoteIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remoteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  remoteSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  remoteCurrent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  remoteCurrentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  remoteSwapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  remoteSwapButtonText: {
    color: '#0EA5E9',
    fontSize: 12,
    fontWeight: '700',
  },
  remotePendingText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#7C3AED',
    fontWeight: '600',
  },
  deliverySwapButton: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  deliverySwapButtonText: {
    color: '#16A34A',
  },
  modeCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  modeSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  modeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeChip: {
    minWidth: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  modeChipActive: {
    borderColor: '#60A5FA',
    backgroundColor: '#EFF6FF',
  },
  modeChipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  modeChipDescription: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },
  modalItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  modalItemActive: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  modalItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalItemSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  closeButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeButtonText: {
    color: '#0EA5E9',
    fontWeight: '700',
  },
  installmentsItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  installmentsText: {
    color: '#0F172A',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
});

export default styles;

export const inlineStyle_491_14 = {
  flex: 1,
};

export const inlineStyle_534_10 = {
  marginRight: 16,
};
