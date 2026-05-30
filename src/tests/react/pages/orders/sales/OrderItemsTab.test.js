const {jest} = require('@jest/globals')

const {describe, expect, it} = global

jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
  useWindowDimensions: () => ({height: 800, width: 400}),
}))

jest.mock('@store', () => ({
  useStore: jest.fn(() => ({
    actions: {},
    getters: {},
  })),
}))

jest.mock('@controleonline/ui-orders/src/react/css/orders', () => () => ({
  styles: {
    itemsSection: {},
  },
}))

jest.mock('@controleonline/ui-orders/src/react/components/OrderProducts', () => () => null)

jest.mock('../../../../../react/pages/orders/sales/useOrderDetailsVisuals', () => () => ({
  ppcColors: {
    accentInfo: '#0EA5E9',
    primary: '#0EA5E9',
    textSecondary: '#64748B',
  },
  styles: {},
}))

jest.mock('../../../../../react/pages/orders/sales/orderDetails.styles', () => ({
  inlineStyle_2116_14: {},
  inlineStyle_2121_14: () => ({}),
  inlineStyle_2128_20: {},
}))

jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon')

const {
  getOrderProductsFallbackFetchKey,
  getOrderSyncSignature,
  shouldRequestOrderDetails,
  shouldRequestOrderProductsFallback,
} = require('../../../../../react/pages/orders/sales/OrderItemsTab')

describe('OrderItemsTab fallback fetch gate', () => {
  it('builds a stable request key per order id', () => {
    expect(getOrderProductsFallbackFetchKey('71546')).toBe('71546')
    expect(getOrderProductsFallbackFetchKey(71546)).toBe('71546')
    expect(getOrderProductsFallbackFetchKey('')).toBe('')
    expect(getOrderProductsFallbackFetchKey(null)).toBe('')
  })

  it('requests fallback only once per order while the payload remains incomplete', () => {
    const firstAttempt = shouldRequestOrderProductsFallback({
      routeOrderId: '71546',
      skipFallbackReason: '',
      lastRequestedRouteOrderId: '',
    })

    const repeatedAttempt = shouldRequestOrderProductsFallback({
      routeOrderId: '71546',
      skipFallbackReason: '',
      lastRequestedRouteOrderId: '71546',
    })

    const nextOrderAttempt = shouldRequestOrderProductsFallback({
      routeOrderId: '71547',
      skipFallbackReason: '',
      lastRequestedRouteOrderId: '71546',
    })

    const alreadyRequestedAttempt = shouldRequestOrderProductsFallback({
      routeOrderId: '71546',
      skipFallbackReason: '',
      lastRequestedRouteOrderId: '',
      alreadyRequested: true,
    })

    expect(firstAttempt).toBe(true)
    expect(repeatedAttempt).toBe(false)
    expect(nextOrderAttempt).toBe(true)
    expect(alreadyRequestedAttempt).toBe(false)
  })

  it('skips fallback when embedded data is already sufficient or when a skip reason exists', () => {
    expect(
      shouldRequestOrderProductsFallback({
        routeOrderId: '71546',
        skipFallbackReason: 'embedded-order-products-sufficient',
        lastRequestedRouteOrderId: '',
      }),
    ).toBe(false)

    expect(
      shouldRequestOrderProductsFallback({
        routeOrderId: '71546',
        skipFallbackReason: 'fallback-order-products-loading',
        lastRequestedRouteOrderId: '',
      }),
    ).toBe(false)

    expect(
      shouldRequestOrderProductsFallback({
        routeOrderId: '71546',
        skipFallbackReason: 'fallback-order-products-error',
        lastRequestedRouteOrderId: '',
      }),
    ).toBe(false)
  })

  it('does not refetch the order when it is already loaded and the embedded products are empty', () => {
    expect(
      shouldRequestOrderDetails({
        routeOrderId: '71546',
        resolvedOrderId: 71546,
        orderProducts: [],
      }),
    ).toBe(false)
  })

  it('still fetches order details while the order is not loaded yet or when embedded items need enrichment', () => {
    expect(
      shouldRequestOrderDetails({
        routeOrderId: '71546',
        resolvedOrderId: null,
        orderProducts: [],
      }),
    ).toBe(true)

    expect(
      shouldRequestOrderDetails({
        routeOrderId: '71546',
        resolvedOrderId: 71546,
        orderProducts: [
          {
            id: 1,
            quantity: 1,
            product: { id: 101, type: 'custom', product: 'Combo Gyros' },
          },
        ],
      }),
    ).toBe(true)
  })

  it('builds a stable sync signature for equivalent order payloads', () => {
    const baseOrder = {
      id: 71546,
      status: {status: 'open', realStatus: 'open', color: '#0EA5E9'},
      client: {id: 42},
      addressDestination: {id: 99},
      comments: '',
      orderProducts: [],
    }

    const equivalentOrder = {
      ...baseOrder,
      status: {...baseOrder.status},
      client: {...baseOrder.client},
      addressDestination: {...baseOrder.addressDestination},
      orderProducts: [],
    }

    const changedOrder = {
      ...baseOrder,
      status: {...baseOrder.status, realStatus: 'preparing'},
    }

    expect(getOrderSyncSignature(baseOrder)).toBe(getOrderSyncSignature(equivalentOrder))
    expect(getOrderSyncSignature(baseOrder)).not.toBe(getOrderSyncSignature(changedOrder))
  })
})
