import {Platform, StyleSheet} from 'react-native'

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
  android: {elevation: 10},
  web: {boxShadow: '0 24px 48px rgba(15,23,42,0.22)'},
})

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    gap: 18,
    maxWidth: 460,
    padding: 20,
    width: '100%',
    ...cardShadow,
  },
  header: {
    gap: 10,
  },
  headerTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 14,
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  title: {
    flex: 1,
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '800',
  },
  description: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
  },
  methodGrid: {
    gap: 5,
  },
  methodButton: {
    alignItems: 'stretch',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    width: '100%',
  },
  methodButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#38BDF8',
  },
  methodButtonDisabled: {
    opacity: 0.55,
  },
  methodHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  methodLabel: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  methodDescription: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 16,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '600',
    minHeight: 56,
    outlineStyle: 'none',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#CBD5E1',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46,
    minWidth: 112,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0EA5E9',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 46,
    minWidth: 132,
    paddingHorizontal: 18,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
})

export default styles
