import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import {getStateFromPath as defaultGetStateFromPath} from '@react-navigation/native'
import {MaterialCommunityIcons} from '@expo/vector-icons'
import {Pressable, StyleSheet} from 'react-native'

//import CheckoutHomePage from '@controleonline/ui-crm/src/react/pages/home/index'
import CRMHomePage from '@controleonline/ui-crm/src/react/pages/home/index'
import ManagerHomePage from '@controleonline/ui-manager/src/react/pages/home/index'
import POSHomePage from '@controleonline/ui-orders/src/react/pages/home/index'
import DeliveryHomePage from '@controleonline/ui-logistic/src/react/pages/home/index'
import PPCHomePage from '@controleonline/ui-ppc/src/react/pages/displays/displayPage'
import ShopHomePage from '@controleonline/ui-shop/src/react/pages/ShopLandingPage'
import MarketingDashboard from '../pages/mkt/MarketingDashboard'
import ServiceHomePage from '@controleonline/ui-support/src/react/pages/home/index'

import DefaultLayout from '@controleonline/ui-layout/src/react/layouts/DefaultLayout'

import commonRoutes from '@controleonline/ui-common/src/react/router/routes'
import contractsRoutes from '@controleonline/ui-contracts/src/react/router/routes'
import crmRoutes from '@controleonline/ui-crm/src/react/router/routes'
import customersRoutes from '@controleonline/ui-customers/src/react/router/routes'
import loginRoutes from '@controleonline/ui-login/src/react/router/routes'
import managerRoutes from '@controleonline/ui-manager/src/react/router/routes'
import ordersRoutes from '@controleonline/ui-orders/src/react/router/routes'
import reportRoutes from '@controleonline/ui-report/src/react/router/routes'
import employeeRoutes from '@controleonline/ui-employee/src/react/router/routes'
import peopleRoutes from '@controleonline/ui-people/src/react/router/routes'
import logisticRoutes from '@controleonline/ui-logistic/src/react/router/routes'
import productsRoutes from '@controleonline/ui-products/src/react/router/routes'
import shopRoutes from '@controleonline/ui-shop/src/react/router/routes'
import testsRoutes from '@controleonline/ui-tests/src/react/router/routes'
import {app_type} from '@appType'
import {
  normalizeInitialBrowserPath,
  normalizeProductDetailsTabPath,
} from './browserPath'
import {createStableRouteComponents} from './stableRouteComponents'

const Stack = createNativeStackNavigator()

const routerStyles = StyleSheet.create({
  headerBackButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    marginLeft: -8,
    width: 40,
  },
})

const DEFAULT_ROUTE_OPTIONS = {
  headerShown: true,
  headerBackVisible: true,
  showBottomToolBar: true,
}

const resolveRouteOptions = (screenOptions, args = {}) => {
  const resolvedOptions =
    typeof screenOptions === 'function'
      ? screenOptions(args)
      : (screenOptions || {})
  const {headerBackFallback, ...nativeOptions} = resolvedOptions

  if (typeof nativeOptions.title === 'function') {
    nativeOptions.title = nativeOptions.title(args)
  }

  if (headerBackFallback && nativeOptions.headerShown !== false) {
    nativeOptions.headerBackVisible = false
    nativeOptions.headerLeft = () => (
      React.createElement(
        Pressable,
        {
          accessibilityLabel: 'Voltar',
          accessibilityRole: 'button',
          hitSlop: 8,
          onPress: () => {
            const {navigation, route} = args

            if (navigation?.canGoBack?.()) {
              navigation.goBack()
              return
            }

            const fallback =
              typeof headerBackFallback === 'function'
                ? headerBackFallback({navigation, route})
                : headerBackFallback

            if (Array.isArray(fallback?.resetRoutes) && fallback.resetRoutes.length > 0) {
              navigation?.reset?.({
                index: fallback.resetRoutes.length - 1,
                routes: fallback.resetRoutes,
              })
              return
            }

            if (fallback?.name) {
              navigation?.navigate?.(fallback.name, fallback.params || {})
            }
          },
          style: routerStyles.headerBackButton,
        },
        React.createElement(MaterialCommunityIcons, {
          color: '#0F172A',
          name: 'arrow-left',
          size: 24,
        }),
      )
    )
  }

  return {
    ...DEFAULT_ROUTE_OPTIONS,
    ...nativeOptions,
  }
}

export const allRoutes = [
  ...commonRoutes,
  ...contractsRoutes,
  ...crmRoutes,
  ...customersRoutes,
  ...loginRoutes,
  ...managerRoutes,
  ...ordersRoutes,
  ...reportRoutes,
  ...employeeRoutes,
  ...logisticRoutes,
  ...peopleRoutes,
  ...productsRoutes,
  ...shopRoutes,
  ...testsRoutes,
]

const homeByType = {
//  CHECKOUT: CheckoutHomePage,
  CRM: CRMHomePage,
  DELIVERY: DeliveryHomePage,
  ADMIN: ManagerHomePage,
  MANAGER: ManagerHomePage,
  SERVICE: ServiceHomePage,
  SHOP: ShopHomePage,
  POS: POSHomePage,
  PPC: PPCHomePage,
  MKT: MarketingDashboard,
}

const normalizedAppType = app_type

if (homeByType[normalizedAppType]) {
  allRoutes.push({
    name: 'HomePage',
    component: homeByType[normalizedAppType],
    options: {
      headerShown: false,
      headerBackVisible: normalizedAppType !== 'PPC',
      title: 'Menu',
      showBottomToolBar: normalizedAppType !== 'PPC',
      showBottomCart: false,
      showCompanyFilter: normalizedAppType !== 'DELIVERY',
    },
  })
}

const routeDefinitions = (() => {
  const seen = new Set()
  return allRoutes.filter(route => {
    if (!route?.name || !route?.component) return false
    if (seen.has(route.name)) return false
    seen.add(route.name)
    return true
  })
})()

normalizeInitialBrowserPath(globalThis?.window)

const WrappedComponent = (screenOptions, Component) => ({ navigation, route }) => {
  const resolvedOptions = resolveRouteOptions(screenOptions, {navigation, route})

  return React.createElement(
    DefaultLayout,
    {navigation, options: resolvedOptions, route},
    React.createElement(Component, {navigation, route}),
  )
}

const stableRouteComponents = createStableRouteComponents(
  routeDefinitions,
  WrappedComponent,
)

export const linking = (() => {
  const screens = {}
  const seen = new Set()

  for (const route of routeDefinitions) {
    if (!route?.name) continue
    if (seen.has(route.name)) continue

    seen.add(route.name)
    screens[route.name] =
      route.name === 'HomePage'
        ? ''
        : route.path || route.name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
  }

  return {
    prefixes: ['/', 'http://localhost:19006'],
    config: { screens },
    getStateFromPath(path, options) {
      let normalizedPath = String(path || '').replace(/^\/?shop\/q=/, 'shop/search/')
      normalizedPath = normalizeProductDetailsTabPath(normalizedPath)

      const legacyMatch =
        normalizedPath.match(/[?&]f=([^&]+)/i) ||
        normalizedPath.match(/^\/?(?:shop\/)?f=([^/?&]+)/i)

      if (legacyMatch?.[1]) {
        const flag = decodeURIComponent(legacyMatch[1]).toLowerCase()
        const legacyMap = {
          perfil: 'orders/my-profile',
          profile: 'orders/my-profile',
          carrinho: 'cart',
          cart: 'cart',
          pedidos: 'orders/my',
          pedido: 'orders/my',
          checkout: 'shop/checkout',
          pagamento: 'shop/checkout',
          cartoes: 'shop/cards',
          cartões: 'shop/cards',
        }

        if (legacyMap[flag]) {
          normalizedPath = legacyMap[flag]
        }
      }

      return defaultGetStateFromPath(normalizedPath, options)
    },
  }
})()

const getInitialRouteName = () => {
  const routeNames = routeDefinitions.map(route => route?.name).filter(Boolean)

  if (routeNames.includes('HomePage')) return 'HomePage'
  if (routeNames.includes('SignInPage')) return 'SignInPage'
  return routeNames[0]
}

export default function Routes() {
  return React.createElement(
    Stack.Navigator,
    {
      detachInactiveScreens: true,
      initialRouteName: getInitialRouteName(),
    },
    routeDefinitions.map((route, index) =>
      React.createElement(Stack.Screen, {
        component: stableRouteComponents.get(route),
        initialParams: route.initialParams,
        key: index,
        name: route.name,
        options: args => resolveRouteOptions(route.options, args),
      }),
    ),
  )
}
