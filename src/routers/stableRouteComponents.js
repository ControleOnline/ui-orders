export const createStableRouteComponents = (routeDefinitions, wrapRoute) =>
  new Map(
    routeDefinitions.map(route => [
      route,
      wrapRoute(route.options, route.component),
    ]),
  )
