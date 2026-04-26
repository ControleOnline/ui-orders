import {StyleSheet} from 'react-native';

export default StyleSheet.create({
  feedbackCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D6DEE8',
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    marginHorizontal: 8,
    padding: 18,
  },
  feedbackText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
  },
  feedbackTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  paymentOption: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D6DEE8',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  paymentOptionSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  paymentSubtitle: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  paymentTextWrap: {
    flex: 1,
  },
  paymentTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 220,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D6DEE8',
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    marginHorizontal: 8,
    marginBottom: 12,
    padding: 14,
  },
  sectionOptions: {
    gap: 10,
  },
  sectionSubtitle: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  selectionIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
