import { StyleSheet } from 'react-native'

const sharedStyles = StyleSheet.create({
  itemMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
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
  groupItemMetaWrap: {
    marginTop: 4,
    gap: 3,
  },
  groupItemActions: {
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
})

export default sharedStyles
