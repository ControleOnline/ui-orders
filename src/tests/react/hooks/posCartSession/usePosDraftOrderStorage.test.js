jest.mock('react', () => ({useCallback: callback => callback}))
const usePosDraftOrderStorage = require('../../../../react/hooks/posCartSession/usePosDraftOrderStorage').default

describe('POS draft storage isolation', () => {
  afterEach(() => {delete global.localStorage})

  it('retains separate company and device keys and normalizes order IRIs', () => {
    const values = new Map()
    global.localStorage = {
      getItem: key => values.get(key),
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key),
    }
    const first = usePosDraftOrderStorage('company-1:device-1')
    const second = usePosDraftOrderStorage('company-1:device-2')
    first.rememberDraftOrderId({'@id': '/orders/912'})
    second.rememberDraftOrderId({id: 913})
    expect(first.readStoredDraftOrderId()).toBe('912')
    expect(second.readStoredDraftOrderId()).toBe('913')
    first.clearStoredDraftOrderId()
    expect(first.readStoredDraftOrderId()).toBeNull()
    expect(second.readStoredDraftOrderId()).toBe('913')
  })

  it('ignores missing storage, missing keys, and invalid order IDs', () => {
    const missing = usePosDraftOrderStorage('device')
    expect(missing.readStoredDraftOrderId()).toBeNull()
    expect(() => missing.rememberDraftOrderId({id: 1})).not.toThrow()
    expect(() => missing.clearStoredDraftOrderId()).not.toThrow()
    global.localStorage = {setItem: jest.fn(), getItem: jest.fn(), removeItem: jest.fn()}
    usePosDraftOrderStorage('').rememberDraftOrderId({id: 1})
    usePosDraftOrderStorage('device').rememberDraftOrderId({})
    expect(global.localStorage.setItem).not.toHaveBeenCalled()
  })
})
