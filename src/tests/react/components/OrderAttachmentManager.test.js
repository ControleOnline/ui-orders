const {jest} = require('@jest/globals')
const React = require('react')
const ReactDOMServer = require('react-dom/server')

const {describe, expect, it} = global

jest.mock('react-native', () => {
  const React = require('react')
  const createComponent = name =>
    function MockComponent(props) {
      return React.createElement(name.toLowerCase(), null, props.children)
    }

  return {
    ActivityIndicator: createComponent('ActivityIndicator'),
    Image: createComponent('Image'),
    Linking: {
      openURL: jest.fn(),
    },
    Platform: {OS: 'web'},
    StyleSheet: {
      create: value => value,
    },
    ScrollView: createComponent('ScrollView'),
    Text: createComponent('Text'),
    TextInput: createComponent('TextInput'),
    TouchableOpacity: createComponent('TouchableOpacity'),
    View: createComponent('View'),
  }
})

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}))

jest.mock(
  '@expo/vector-icons',
  () => ({
    MaterialCommunityIcons: props => React.createElement('icon', props),
  }),
  {virtual: true},
)

jest.mock('@store', () => ({
  useStore: jest.fn(name => {
    if (name === 'people') {
      return {
        actions: {},
        getters: {
          currentCompany: {id: 7},
          defaultCompany: {id: 7},
        },
      }
    }

    if (name === 'file') {
      return {
        actions: {
          getItems: jest.fn().mockResolvedValue([]),
        },
        getters: {
          items: [
            {
              id: 11,
              fileName: 'NF-e.pdf',
              fileType: 'application',
              extension: 'pdf',
            },
          ],
          totalItems: 1,
        },
      }
    }

    if (name === 'order_file') {
      return {
        actions: {
          getItems: jest.fn().mockResolvedValue([]),
          remove: jest.fn().mockResolvedValue(true),
          save: jest.fn().mockResolvedValue({
            id: 99,
            order: '/orders/9',
            file: '/files/11',
          }),
        },
        getters: {
          items: [
            {
              id: 41,
              file: {
                id: 11,
                fileName: 'NF-e.pdf',
                fileType: 'application',
                extension: 'pdf',
              },
            },
          ],
        },
      }
    }

    return {
      actions: {},
      getters: {},
    }
  }),
}))

jest.mock('@controleonline/ui-common/src/react/components/AnimatedModal', () => props =>
  (props.visible ? React.createElement('animatedmodal', null, props.children) : null),
)

jest.mock('@controleonline/ui-common/src/react/components/MessageService', () => ({
  useMessage: () => ({
    showError: jest.fn(),
    showSuccess: jest.fn(),
  }),
}))

jest.mock('@controleonline/ui-common/src/react/utils/fileUrl', () => ({
  resolveFileDownloadUrl: () => 'https://example.test/files/11/download',
  resolveDefaultFileSource: () => ({uri: 'https://example.test/files/11'}),
  resolveFileImageUrl: () => '',
}))

jest.mock('@controleonline/ui-default/src/react/components/upload/fileUpload', () => ({
  extractFileId: file => file?.id || String(file || '').match(/(\d+)$/)?.[1] || null,
  selectFile: jest.fn(),
  toFileIri: file => file?.['@id'] || `/files/${file?.id || 0}`,
  uploadFileToApi: jest.fn(),
}))

const OrderAttachmentManager =
  require('../../../react/pages/orders/sales/components/OrderAttachmentManager').default

describe('OrderAttachmentManager', () => {
  it('renders the order attachment manager shell', () => {
    const markup = ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderAttachmentManager, {
        visible: true,
        onClose: jest.fn(),
        order: {id: 9},
      }),
    )

    expect(markup).toContain('Anexos do pedido #9')
    expect(markup).toContain('Gerenciar anexos')
    expect(markup).toContain('Remover')
  })
})
