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

    expect(firstAttempt).toBe(true)
    expect(repeatedAttempt).toBe(false)
    expect(nextOrderAttempt).toBe(true)
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
})
