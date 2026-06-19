const {jest} = require('@jest/globals')

jest.mock('@controleonline/ui-common/src/api', () => ({
  api: {
    fetch: jest.fn(),
  },
}))

jest.mock('@controleonline/ui-default/src/store/default/mutation_types', () => ({
  SET_ERROR: 'SET_ERROR',
  SET_ITEM: 'SET_ITEM',
  SET_ISLOADING: 'SET_ISLOADING',
}))

const {api} = require('@controleonline/ui-common/src/api')
const mutationTypes = require('@controleonline/ui-default/src/store/default/mutation_types')
const {discoveryCart} = require('../../../store/cart/actions')

const {describe, expect, it, beforeEach} = global

describe('cart.actions.discoveryCart', () => {
  beforeEach(() => {
    api.fetch.mockReset()
  })

  it('forces the canonical cart order type when discovering or creating the cart', async () => {
    const commit = jest.fn()
    const response = {
      id: 123,
      orderType: 'sale',
    }

    api.fetch.mockResolvedValue(response)

    const result = await discoveryCart(
      {commit},
      {
        client: 7,
        provider: 3,
        orderType: 'sale',
      },
    )

    expect(api.fetch).toHaveBeenCalledWith('cart', {
      params: {
        client: 7,
        provider: 3,
        orderType: 'cart',
      },
    })
    expect(commit).toHaveBeenNthCalledWith(
      1,
      mutationTypes.SET_ISLOADING,
      true,
    )
    expect(commit).toHaveBeenNthCalledWith(
      2,
      mutationTypes.SET_ITEM,
      response,
    )
    expect(commit).toHaveBeenLastCalledWith(
      mutationTypes.SET_ISLOADING,
      false,
    )
    expect(result).toBe(response)
  })
})
