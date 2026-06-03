import {StyleSheet} from 'react-native';

export const MENU_COLORS = {
  brand: '#2563EB',
  brandSoft: '#EFF6FF',
  brandText: '#0F172A',
  muted: '#64748B',
  border: '#D9E2F1',
  borderSoft: '#E2E8F0',
  background: '#F8FAFC',
  panel: '#FFFFFF',
  panelSoft: '#F8FAFC',
  good: '#16A34A',
  warn: '#D97706',
  bad: '#DC2626',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: MENU_COLORS.background,
  },
  page: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 14,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleBlock: {
    flexShrink: 1,
  },
  eyebrow: {
    color: MENU_COLORS.brand,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  pageTitle: {
    color: MENU_COLORS.brandText,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
  },
  toolbarActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MENU_COLORS.border,
    backgroundColor: MENU_COLORS.panel,
  },
  toolbarButtonPrimary: {
    borderColor: MENU_COLORS.brand,
    backgroundColor: MENU_COLORS.brandSoft,
  },
  toolbarButtonText: {
    color: MENU_COLORS.brandText,
    fontSize: 12,
    fontWeight: '800',
  },
  toolbarButtonTextPrimary: {
    color: MENU_COLORS.brand,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
    minHeight: 0,
  },
  bodyCompact: {
    flexDirection: 'column',
  },
  sidebar: {
    width: 220,
    minWidth: 220,
  },
  sidebarCompact: {
    width: '100%',
    minWidth: 0,
  },
  menuList: {
    gap: 8,
  },
  menuListHorizontal: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: MENU_COLORS.border,
    backgroundColor: MENU_COLORS.panel,
  },
  iconButtonActive: {
    borderColor: MENU_COLORS.brand,
    backgroundColor: MENU_COLORS.brandSoft,
  },
  iconButtonText: {
    color: MENU_COLORS.brandText,
    fontSize: 12,
    fontWeight: '700',
  },
  iconButtonTextActive: {
    color: MENU_COLORS.brand,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 12,
  },
  sectionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionEyebrow: {
    color: MENU_COLORS.brand,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: MENU_COLORS.brandText,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 320,
    maxWidth: 420,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MENU_COLORS.border,
    backgroundColor: MENU_COLORS.panel,
  },
  searchInput: {
    flex: 1,
    color: MENU_COLORS.brandText,
    fontSize: 14,
    paddingVertical: 0,
  },
  searchClearButton: {
    padding: 2,
  },
  splitLayout: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
    minHeight: 0,
  },
  splitLayoutCompact: {
    flexDirection: 'column',
  },
  listPanel: {
    flex: 0.42,
    minWidth: 340,
    backgroundColor: MENU_COLORS.panel,
    borderWidth: 1,
    borderColor: MENU_COLORS.borderSoft,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 0,
  },
  listPanelCompact: {
    flex: 1,
    minWidth: 0,
  },
  detailPanel: {
    flex: 0.58,
    minWidth: 360,
    backgroundColor: MENU_COLORS.panel,
    borderWidth: 1,
    borderColor: MENU_COLORS.borderSoft,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 0,
  },
  detailPanelCompact: {
    flex: 1,
    minWidth: 0,
  },
  listContent: {
    padding: 12,
    paddingBottom: 18,
  },
  orderCard: {
    borderWidth: 1,
    borderColor: MENU_COLORS.borderSoft,
    borderRadius: 14,
    backgroundColor: MENU_COLORS.panel,
    padding: 10,
    marginBottom: 10,
  },
  orderCardSelected: {
    borderColor: MENU_COLORS.brand,
    backgroundColor: MENU_COLORS.brandSoft,
  },
  orderCardMetaRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: MENU_COLORS.brandText,
  },
  toneGood: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  toneWarn: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  toneBad: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  toneNeutral: {
    borderColor: MENU_COLORS.borderSoft,
    backgroundColor: MENU_COLORS.panelSoft,
  },
  detailScroll: {
    flex: 1,
  },
  detailContent: {
    padding: 16,
    gap: 14,
  },
  detailHeader: {
    gap: 12,
  },
  detailHeaderActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: MENU_COLORS.borderSoft,
    borderRadius: 14,
    backgroundColor: MENU_COLORS.panel,
    padding: 14,
    gap: 10,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionCardTitle: {
    color: MENU_COLORS.brandText,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionCardSubtitle: {
    color: MENU_COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  sectionCardMeta: {
    color: MENU_COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoCell: {
    width: '48%',
    minWidth: 220,
    borderWidth: 1,
    borderColor: MENU_COLORS.borderSoft,
    borderRadius: 12,
    backgroundColor: MENU_COLORS.background,
    padding: 12,
  },
  infoLabel: {
    color: MENU_COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoValue: {
    color: MENU_COLORS.brandText,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  infoHelper: {
    color: MENU_COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  lineList: {
    gap: 10,
  },
  lineCard: {
    borderWidth: 1,
    borderColor: MENU_COLORS.borderSoft,
    borderRadius: 12,
    backgroundColor: MENU_COLORS.panel,
    padding: 12,
    gap: 6,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  lineTitle: {
    flex: 1,
    color: MENU_COLORS.brandText,
    fontSize: 14,
    fontWeight: '800',
  },
  lineValue: {
    color: MENU_COLORS.brandText,
    fontSize: 13,
    fontWeight: '800',
  },
  lineMeta: {
    color: MENU_COLORS.muted,
    fontSize: 12,
  },
  attachmentList: {
    gap: 10,
  },
  attachmentCard: {
    borderWidth: 1,
    borderColor: MENU_COLORS.borderSoft,
    borderRadius: 12,
    backgroundColor: MENU_COLORS.background,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  attachmentMain: {
    flex: 1,
    minWidth: 0,
  },
  attachmentTitle: {
    color: MENU_COLORS.brandText,
    fontSize: 13,
    fontWeight: '800',
  },
  attachmentMeta: {
    color: MENU_COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  attachmentAction: {
    color: MENU_COLORS.brand,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyStateText: {
    color: MENU_COLORS.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  loadingMore: {
    paddingVertical: 16,
  },
});

export default styles;

