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
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
})

export default sharedStyles
