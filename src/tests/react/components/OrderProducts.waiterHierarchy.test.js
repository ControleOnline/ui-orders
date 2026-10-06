const React = require('react')
const renderer = require('react-test-renderer')
const { jest } = require('@jest/globals')

global.IS_REACT_ACT_ENVIRONMENT = true

jest.mock('react-native', () => {
  const React = require('react')
  const createComponent = name => props => React.createElement(name, props, props.children)

  return {
    Image: createComponent('Image'),
    StyleSheet: { create: value => value },
    Text: createComponent('Text'),
    TouchableOpacity: createComponent('TouchableOpacity'),
    ActivityIndicator: createComponent('ActivityIndicator'),
    View: createComponent('View'),
  }
})

jest.mock('@expo/vector-icons', () => {
  const React = require('react')
  return {
    MaterialCommunityIcons: props => React.createElement('MaterialCommunityIcons', props),
  }
}, { virtual: true })

jest.mock('@controleonline/../../src/styles/branding', () => ({
  withOpacity: (color, opacity) => `${color}:${opacity}`,
}))

jest.mock('@controleonline/ui-common/src/react/utils/fileUrl', () => ({
  resolveFileImageUrl: file => typeof file === 'string' ? file : file?.['@id'] || '',
}))

jest.mock('@controleonline/ui-common/src/utils/formatter', () => ({
  __esModule: true,
  default: { formatMoney: value => String(value) },
}))


jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon')
const OrderProducts = require('../../../react/components/OrderProducts').default
const Actions = require('../../../react/pages/orders/sales/orderDetails/OrderDetailsProductActions').default
let tree
afterEach(() => {if (tree) renderer.act(() => tree.unmount()); tree = null})
it('keeps photos, groups, quantities and direct editing of the customized second level', () => {
 const edit = jest.fn()
 const root = {id: 1, quantity: 2, total: 146, product: {id: 1343, type: 'custom', product: 'Combo', productFiles: [{file: '/files/combo'}]}}
 const drink = {id: 2, orderProduct: '/order_products/1', quantity: 2, showInParentQueue: false,
  productGroup: {id: 10, productGroup: 'Escolha sua bebida'}, product: {id: 1148, product: 'Água', productFiles: [{file: '/files/agua'}]}}
 const fries = {id: 3, orderProduct: '/order_products/1', quantity: 2, showInParentQueue: false,
  productGroup: {id: 11, productGroup: 'Escolha sua batata'}, product: {id: 1108, type: 'custom', product: 'Batata', productFiles: [{file: '/files/batata'}]}}
 const salt = {id: 4, orderProduct: '/order_products/3', quantity: 2, showInParentQueue: true,
  productGroup: {id: 12, productGroup: 'Tempero'}, product: {id: 1340, product: 'Sal'}}
 const sauce = {id: 5, orderProduct: '/order_products/3', quantity: 2, showInParentQueue: true,
  productGroup: {id: 13, productGroup: 'Molho'}, product: {id: 1935, product: 'Molho degustação'}}
 renderer.act(() => {tree = renderer.create(React.createElement(OrderProducts, {
  compactTree: true, showHierarchyGuides: true, showImages: true, showDetails: true,
  showRootQuantityPrefix: true, orderProducts: [root, drink, fries, salt, sauce], styles: {},
  renderActions: args => React.createElement(Actions, {...args, canMutateOrderProducts: true,
   localStyles: {}, ppcColors: {}, isOrderProductCommitting: () => false,
   handleEditCustomizableOrderProduct: edit}),
 }))})
 expect(tree.root.findAllByType('Image').map(node => node.props.source.uri)).toEqual(['/files/combo', '/files/agua', '/files/batata'])
 const text = JSON.stringify(tree.toJSON())
 for (const label of ['Escolha sua bebida', 'Escolha sua batata', 'Sal', 'Molho degustação', 'Quantidade 2 de Batata']) expect(text).toContain(label)
 const editFries = tree.root.findAllByType('TouchableOpacity').find(node => node.props.accessibilityLabel === 'Personalizar Batata')
 expect(editFries).toBeDefined()
 renderer.act(() => editFries.props.onPress())
 expect(edit).toHaveBeenCalledWith(fries)
})
