import { Platform, StyleSheet } from 'react-native';

export const catStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.10)' },
    }),
  },
  coverImage: StyleSheet.absoluteFillObject,
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 14,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...Platform.select({
      web: { backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)' },
      default: { backgroundColor: 'rgba(0,0,0,0.45)' },
    }),
    alignItems: 'center',
    gap: 4,
  },
  overlayName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export const prodStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
    marginBottom: 0,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
    }),
  },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 110, backgroundColor: '#F1F5F9' },
  imagePh: { justifyContent: 'center', alignItems: 'center' },
  qtyBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  qtyBadgeText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  customTag: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245,243,255,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  customTagText: { color: '#8B5CF6', fontSize: 10, fontWeight: '700' },
  body: { padding: 8 },
  name: { fontSize: 12, fontWeight: '700', lineHeight: 16, marginBottom: 4 },
  price: { fontSize: 14, fontWeight: '800' },
});

export const custStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, gap: 12 },
  title: { fontSize: 17, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  body: { flex: 1, flexShrink: 1 },
  groupBlock: { marginHorizontal: 12, marginTop: 12, borderRadius: 14, borderWidth: 1 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  groupName: { fontSize: 15, fontWeight: '800' },
  groupMeta: { fontSize: 12, marginTop: 2 },
  counter: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, minWidth: 36, alignItems: 'center' },
  counterText: { fontSize: 13, fontWeight: '800' },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, gap: 12 },
  optionName: { flex: 1, fontSize: 14, fontWeight: '600' },
  optionPrice: { fontSize: 14, fontWeight: '700' },
  emptyGroup: { padding: 16, fontSize: 13 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, borderTopWidth: 1, gap: 12 },
  totalLabel: { fontSize: 12, fontWeight: '600' },
  totalValue: { fontSize: 22, fontWeight: '900' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

export const gs = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
  },
  searchText: { flex: 1, fontSize: 14, padding: 0 },
  productsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
    gap: 5,
  },
  catBadgeText: { fontSize: 13, fontWeight: '800' },
  catBadgeCount: { fontSize: 12 },
  cartFab: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 6 },
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.18)' },
    }),
  },
  cartFabBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartFabBadgeText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  cartFabTotal: { color: '#fff', fontWeight: '800', fontSize: 15, flex: 1 },
  cartFabLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },
  loadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadBox: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  cartList: { maxHeight: 300 },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, gap: 8 },
  cartItemName: { fontSize: 14, fontWeight: '700', marginBottom: 1 },
  cartItemSub: { fontSize: 11, marginBottom: 2 },
  cartItemPrice: { fontSize: 11 },
  cartItemQty: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 28, height: 28, borderRadius: 7, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  qtyNum: { fontSize: 14, fontWeight: '700', minWidth: 18, textAlign: 'center' },
  cartItemTotal: { fontSize: 13, fontWeight: '800', minWidth: 64, textAlign: 'right' },
  cartSummary: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clientBlock: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  clientSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6 },
  clientSelected: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 6 },
  clientSelectedName: { fontSize: 14, fontWeight: '700' },
  clientResult: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  clientResultName: { fontSize: 14 },
  totalLabel: { fontSize: 14, fontWeight: '600' },
  totalValue: { fontSize: 22, fontWeight: '900' },
  payScroll: { maxHeight: 360, paddingHorizontal: 12, paddingTop: 4 },
  payAdded: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 4, borderBottomWidth: 1 },
  payAddedName: { flex: 1, fontSize: 14, fontWeight: '700' },
  payAddedAmt: { fontSize: 14, fontWeight: '800' },
  addPayBlock: { borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 10, marginBottom: 6 },
  addPayTitle: { fontSize: 11, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  payOption: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 6 },
  payOptionName: { fontSize: 14, fontWeight: '700', flex: 1 },
  payAmtRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  payAmtLabel: { fontSize: 13, fontWeight: '600' },
  amtInput: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, fontWeight: '700', textAlign: 'right' },
  addPayBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  addPayBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  payTotals: { borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 8, gap: 5 },
  payTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 2 },
  payTotalLabel: { fontSize: 13, fontWeight: '600' },
  payTotalVal: { fontSize: 15, fontWeight: '800' },
  trocoRow: { paddingHorizontal: 10, paddingVertical: 5 },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  btnPri: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnPriText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  btnSec: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  btnSecText: { fontWeight: '700', fontSize: 15 },
  feedbackWrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 8 },
  feedbackTitle: { fontSize: 22, fontWeight: '900', marginTop: 12 },
  feedbackText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

export const inlineStyle_136_12 = {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  gap: 12,
};

export const inlineStyle_138_14 = (
  {
    palette: palette,
  },
) => ({
  color: palette.textSecondary,
  fontSize: 14,
});

export const inlineStyle_156_12 = (
  {
    cardWidth: cardWidth,
  },
) => ({
  width: cardWidth,
});

export const inlineStyle_160_10 = {
  width: '100%',
};

export const inlineStyle_174_43 = (
  {
    cardWidth: cardWidth,
  },
) => ({
  width: cardWidth,
});

export const inlineStyle_178_14 = {
  width: '100%',
};

export const inlineStyle_205_14 = {
  flex: 1,
  alignItems: 'center',
  padding: 32,
  gap: 8,
};

export const inlineStyle_207_16 = (
  {
    palette: palette,
  },
) => ({
  color: palette.textSecondary,
  fontSize: 14,
});

export const inlineStyle_279_12 = {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
};

export const inlineStyle_287_12 = {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  gap: 12,
  padding: 32,
};

export const inlineStyle_289_14 = (
  {
    palette: palette,
  },
) => ({
  color: palette.textSecondary,
  fontSize: 14,
  textAlign: 'center',
});

export const inlineStyle_391_18 = {
  flex: 1,
};

export const inlineStyle_414_26 = {
  flex: 1,
};

export const inlineStyle_943_93 = {
  marginRight: 6,
};

export const inlineStyle_1048_30 = {
  flex: 1,
};

export const inlineStyle_1208_22 = {
  flexDirection: 'row',
  gap: 12,
  marginTop: 24,
};

export const inlineStyle_172_6 = (
  {
    gap: gap,
    maxWidth: maxWidth,
  },
) => ({
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap,
  padding: gap,
  alignSelf: 'center',
  width: maxWidth,
});

export const inlineStyle_331_6 = (
  {
    gap: gap,
    maxWidth: maxWidth,
  },
) => ({
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap,
  padding: gap,
  paddingBottom: 100,
  alignSelf: 'center',
  width: maxWidth,
});


