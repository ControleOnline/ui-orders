const {jest} = require('@jest/globals')

const mockPayment = jest.fn()
const mockFetch = jest.fn()
const mockGetAllStores = jest.fn()

jest.mock('@controleonline-rn/react-native-cielo-payment', () => ({
  payment: (...args) => mockPayment(...args),
}))

jest.mock('@controleonline/ui-common/src/api', () => ({
  api: {
    fetch: (...args) => mockFetch(...args),
  },
}))

jest.mock('@store', () => ({
  getAllStores: (...args) => mockGetAllStores(...args),
}))

jest.mock('@env', () => ({
  env: {
    CIELO: {
      ACCESS_TOKEN: '',
      CLIENT_ID: '',
      EMAIL: '',
    },
  },
}))

const {describe, expect, it, beforeEach} = global

const loadService = () => {
  const serviceModule = require('../../../react/services/Cielo/Cielo')
  return serviceModule.default || serviceModule
}

describe('CieloService', () => {
  beforeEach(() => {
    jest.resetModules()
    mockPayment.mockReset()
    mockFetch.mockReset()
    mockGetAllStores.mockReset()

    mockPayment.mockResolvedValue({
      success: true,
      code: '0',
      result: JSON.stringify({status: 'ok'}),
    })
  })

  it('falls back to the main company private CIELO config when runtime configs are empty', async () => {
    mockGetAllStores.mockReturnValue({
      people: {
        getters: {
          currentCompany: {
            id: 21,
            configs: {},
          },
          defaultCompany: {
            id: 99,
          },
        },
      },
      configs: {
        getters: {
          items: {},
        },
      },
    })
    mockFetch.mockResolvedValue({
      member: [
        {
          configKey: 'CIELO',
          configValue: JSON.stringify({
            ACCESS_TOKEN: 'private-token',
            CLIENT_ID: 'private-client',
            EMAIL: 'cielo@principal.com',
          }),
        },
      ],
    })

    const CieloService = loadService()
    const service = new CieloService()

    await service.payment('credit', [{name: 'Produto'}], 1250)

    expect(mockFetch).toHaveBeenCalledWith('/configs', {
      params: {
        configKey: 'CIELO',
        itemsPerPage: 1,
        people: '/people/99',
        visibility: 'private',
      },
    })

    expect(mockPayment).toHaveBeenCalledTimes(1)
    expect(JSON.parse(mockPayment.mock.calls[0][0])).toMatchObject({
      accessToken: 'private-token',
      clientID: 'private-client',
      email: 'cielo@principal.com',
      paymentCode: 'credit',
      value: 1250,
    })
  })

  it('uses the runtime CIELO config without fetching the private config again', async () => {
    mockGetAllStores.mockReturnValue({
      people: {
        getters: {
          currentCompany: {
            id: 99,
            configs: {
              CIELO: JSON.stringify({
                ACCESS_TOKEN: 'runtime-token',
                CLIENT_ID: 'runtime-client',
                EMAIL: 'runtime@empresa.com',
              }),
            },
          },
          defaultCompany: {
            id: 99,
          },
        },
      },
      configs: {
        getters: {
          items: {
            CIELO: JSON.stringify({
              ACCESS_TOKEN: 'runtime-token',
              CLIENT_ID: 'runtime-client',
              EMAIL: 'runtime@empresa.com',
            }),
          },
        },
      },
    })

    const CieloService = loadService()
    const service = new CieloService()

    await service.payment('debit', [], 500)

    expect(mockFetch).not.toHaveBeenCalled()
    expect(JSON.parse(mockPayment.mock.calls[0][0])).toMatchObject({
      accessToken: 'runtime-token',
      clientID: 'runtime-client',
      email: 'runtime@empresa.com',
      paymentCode: 'debit',
      value: 500,
    })
  })
})
