const {extractLinkedOrderCodeFromNfcTag} = require('../../../react/utils/linkedOrderNfc')

const {describe, expect, it} = global

describe('linkedOrderNfc', () => {
  it('extracts text payloads from ndef tags', () => {
    const code = extractLinkedOrderCodeFromNfcTag({
      ndefMessage: [
        {
          payload: [2, 101, 110, 49, 50, 51, 52],
          tnf: 0x01,
          type: [0x54],
        },
      ],
    })

    expect(code).toBe('1234')
  })

  it('extracts uri payloads from ndef tags', () => {
    const code = extractLinkedOrderCodeFromNfcTag({
      ndefMessage: [
        {
          payload: [0, 97, 98, 99],
          tnf: 0x01,
          type: [0x55],
        },
      ],
    })

    expect(code).toBe('abc')
  })

  it('falls back to the tag identifier when there is no decodable ndef payload', () => {
    const code = extractLinkedOrderCodeFromNfcTag({
      id: '04AABBCCDD',
      ndefMessage: [],
    })

    expect(code).toBe('04AABBCCDD')
  })
})
