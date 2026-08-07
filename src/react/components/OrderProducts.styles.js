import { StyleSheet } from 'react-native'

const sharedStyles = StyleSheet.create({
  itemMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemLead: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  statusBullet: {
    width: 9,
    height: 9,
    borderRadius: 999,
    marginTop: 4,
    flexShrink: 0,
  },
  statusBulletSpacer: {
    width: 9,
    flexShrink: 0,
  },
  semanticMarker: {
    width: 14,
    marginTop: 1,
    flexShrink: 0,
  },
  conferenceCheck: {
    fontWeight: '900',
  },
  queueIdentifierText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginLeft: 4,
  },
  itemThumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  imageQuantityBadge: {
    position: 'absolute',
    right: -1,
    top: -1,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageQuantityBadgeChild: {
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 3,
  },
  imageQuantityBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
  },
  imageQuantityBadgeTextChild: {
    fontSize: 9,
    lineHeight: 11,
  },
  itemThumbImage: {
    width: '100%',
    height: '100%',
  },
  itemThumbPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  itemThumbPlaceholderText: {
    color: '#64748B',
    fontSize: 18,
    fontWeight: '900',
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 4,
  },
  itemTitleText: {
    minWidth: 0,
    flexShrink: 1,
  },
  metaWrap: {
    marginTop: 6,
    gap: 4,
  },
  queueBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 6,
  },
  queueBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  queueBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  itemActions: {
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  groupItemMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  groupItemContent: {
    flex: 1,
    minWidth: 0,
  },
  groupItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 4,
  },
  groupItemTitleText: {
    minWidth: 0,
    flexShrink: 1,
  },
  groupItemMetaWrap: {
    marginTop: 4,
    gap: 3,
  },
  groupItemActions: {
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  groupItemTrailingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  independentChildrenWrap: {
    marginLeft: 18,
    marginTop: 6,
    paddingLeft: 12,
    borderLeftWidth: 2,
    gap: 6,
  },
  independentChildGroup: {
    gap: 6,
  },
  compactItemRow: {
    paddingVertical: 4,
    marginBottom: 3,
  },
  compactParentWithChildrenRow: {
    borderBottomWidth: 0,
  },
  compactOperationalChildRow: {
    borderTopWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 0,
  },
  hierarchyChildRow: {
    borderTopWidth: 0,
  },
  compactQuantityColumn: {
    width: 25,
    flexGrow: 0,
    flexShrink: 0,
    textAlign: 'right',
  },
  compactMetaWrap: {
    marginTop: 2,
    gap: 2,
  },
  compactGroupWrap: {
    marginTop: 3,
  },
  compactRootGroupWrap: {
    paddingLeft: 26,
  },
  compactGroupTitlePill: {
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 1,
    marginBottom: 2,
  },
  compactGroupItem: {
    paddingVertical: 1,
  },
  compactIndependentChildrenWrap: {
    marginTop: 0,
    paddingLeft: 8,
    gap: 0,
  },
  compactIndependentChildGroup: {
    gap: 3,
    marginTop: 4,
  },
  compactRootFamilySeparator: {
    marginTop: 8,
    paddingTop: 0,
    borderTopWidth: 0,
  },
  compactTreeFamily: {
    marginBottom: 5,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  compactTreeItemRow: {
    marginTop: 0,
    marginBottom: 0,
    paddingVertical: 4,
  },
  compactTreeRootRow: {
    paddingVertical: 6,
  },
  compactTreeChildRow: {
    paddingLeft: 4,
    paddingRight: 4,
    paddingVertical: 2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  compactTreeMainRow: {
    alignItems: 'center',
    gap: 6,
  },
  compactTreeLead: {
    alignItems: 'center',
    gap: 8,
  },
  compactTreeTitle: {
    flexGrow: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  compactTreeChildTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  compactTreeMetaText: {
    fontSize: 11,
    lineHeight: 14,
  },
  compactTreeMetaWrap: {
    marginTop: 0,
    gap: 0,
  },
  compactTreeEmbeddedGroups: {
    paddingLeft: 56,
  },
  compactTreeGroupWrap: {
    marginTop: 0,
    paddingLeft: 0,
    gap: 0,
  },
  compactTreeGroupItem: {
    paddingLeft: 0,
    paddingVertical: 0,
    gap: 0,
  },
  compactTreeTrailingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  compactTreeLinePrice: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  compactTreeIndependentChildrenWrap: {
    marginTop: 0,
    paddingLeft: 5,
    borderLeftWidth: 1,
    gap: 0,
  },
  compactTreeIndependentChildGroup: {
    marginTop: 2,
    marginBottom: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  compactTreeGroupTitle: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
})

export default sharedStyles
