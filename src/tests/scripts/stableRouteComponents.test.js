const {createStableRouteComponents} = require('../../routers/stableRouteComponents')

describe('createStableRouteComponents', () => {
  it('keeps each wrapped route component identity stable', () => {
    const routes = [
      {name: 'History', component: function History() {}},
      {name: 'PdvPage', component: function PdvPage() {}},
    ]
    const wrapped = jest.fn((options, Component) => ({options, Component}))
    const first = createStableRouteComponents(routes, wrapped)
    const second = createStableRouteComponents(routes, wrapped)

    expect(first.get(routes[0])).toBe(first.get(routes[0]))
    expect(first.get(routes[0]).Component).toBe(routes[0].component)
    expect(second.get(routes[0])).not.toBe(first.get(routes[0]))
    expect(wrapped).toHaveBeenCalledTimes(routes.length * 2)
  })
})
