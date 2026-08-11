const {
  extractHydraCollectionItems,
  fetchAllHydraCollectionPages,
  mergeHydraCollectionItemsById,
} = require('../../../react/utils/orderProductsHydration')

const {describe, expect, it} = global

describe('orderProductsHydration', () => {
  it('collects all pages until totalItems is fully covered', async () => {
    const calls = []
    const result = await fetchAllHydraCollectionPages(page => {
      calls.push(page)

      if (page === 1) {
        return Promise.resolve({
          member: Array.from({length: 50}, (_, index) => ({id: index + 1})),
          totalItems: 55,
        })
      }

      return Promise.resolve({
        member: Array.from({length: 5}, (_, index) => ({id: index + 51})),
        totalItems: 55,
      })
    })

    expect(calls).toEqual([1, 2])
    expect(result.complete).toBe(true)
    expect(result.totalItems).toBe(55)
    expect(result.items).toHaveLength(55)
  })

  it('deduplicates items by identity while preserving the newest page payload', () => {
    const merged = mergeHydraCollectionItemsById(
      [{id: 1, quantity: 1}, {id: 2, quantity: 1}],
      [{id: 2, quantity: 3}, {id: 3, quantity: 1}],
    )

    expect(merged).toEqual([
      {id: 1, quantity: 1},
      {id: 2, quantity: 3},
      {id: 3, quantity: 1},
    ])
  })

  it('rejects on fetch failure and resolves on a new independent call', async () => {
    await expect(
      fetchAllHydraCollectionPages(() => Promise.reject(new Error('network error'))),
    ).rejects.toThrow('network error')

    const result = await fetchAllHydraCollectionPages(() =>
      Promise.resolve({
        member: [{id: 1}],
        totalItems: 1,
      }),
    )

    expect(result.totalItems).toBe(1)
    expect(result.items).toHaveLength(1)
    expect(extractHydraCollectionItems({member: result.items})).toHaveLength(1)
    expect(result.complete).toBe(true)
  })

  it('parses hydra-prefixed collection keys', async () => {
    const result = await fetchAllHydraCollectionPages(() =>
      Promise.resolve({
        'hydra:member': [{id: 11}, {id: 12}],
        'hydra:totalItems': 2,
      }),
    )

    expect(result.totalItems).toBe(2)
    expect(result.items).toHaveLength(2)
    expect(extractHydraCollectionItems({'hydra:member': result.items})).toHaveLength(2)
    expect(result.complete).toBe(true)
  })
})
