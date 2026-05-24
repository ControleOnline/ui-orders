const arrayEquals = (left, right) =>
  Array.isArray(left) &&
  Array.isArray(right) &&
  left.length === right.length &&
  left.every((value, index) => value === right[index])

const toByteArray = value => {
  if (Array.isArray(value)) {
    return value
  }

  if (value && typeof value.length === 'number') {
    return Array.from(value)
  }

  return []
}

const bytesToUtf8 = bytes => {
  const safeBytes = toByteArray(bytes)

  if (!safeBytes.length) {
    return ''
  }

  if (typeof globalThis?.TextDecoder !== 'undefined') {
    try {
      return new globalThis.TextDecoder('utf-8').decode(Uint8Array.from(safeBytes))
    } catch {}
  }

  if (typeof Buffer !== 'undefined') {
    try {
      return Buffer.from(safeBytes).toString('utf8')
    } catch {}
  }

  return safeBytes.map(byte => String.fromCharCode(byte)).join('')
}

const decodeNdefTextPayload = payload => {
  const safePayload = toByteArray(payload)

  if (!safePayload.length) {
    return ''
  }

  const languageCodeLength = safePayload[0] & 0x3f
  return bytesToUtf8(safePayload.slice(languageCodeLength + 1)).trim()
}

const decodeNdefUriPayload = payload => {
  const safePayload = toByteArray(payload)

  if (!safePayload.length) {
    return ''
  }

  const protocolPrefix = [
    '',
    'http://www.',
    'https://www.',
    'http://',
    'https://',
    'tel:',
    'mailto:',
    'ftp://anonymous:anonymous@',
    'ftp://ftp.',
    'ftps://',
    'sftp://',
    'smb://',
    'nfs://',
    'ftp://',
    'dav://',
    'news:',
    'telnet://',
    'imap:',
    'rtsp://',
    'urn:',
    'pop:',
    'sip:',
    'sips:',
    'tftp:',
    'btspp://',
    'btl2cap://',
    'btgoep://',
    'tcpobex://',
    'irdaobex://',
    'file://',
    'urn:epc:id:',
    'urn:epc:tag:',
    'urn:epc:pat:',
    'urn:epc:raw:',
    'urn:epc:',
    'urn:nfc:',
  ][safePayload[0]] || ''

  return `${protocolPrefix}${bytesToUtf8(safePayload.slice(1))}`.trim()
}

const decodeNdefRecord = record => {
  const tnf = Number(record?.tnf || 0)
  const type = Array.isArray(record?.type)
    ? record.type
    : typeof record?.type === 'string'
      ? record.type
      : []
  const payload = toByteArray(record?.payload)

  if (!payload.length) {
    return ''
  }

  if (
    tnf === 0x01 &&
    (
      type === 'T' ||
      arrayEquals(type, [0x54])
    )
  ) {
    return decodeNdefTextPayload(payload)
  }

  if (
    tnf === 0x01 &&
    (
      type === 'U' ||
      arrayEquals(type, [0x55])
    )
  ) {
    return decodeNdefUriPayload(payload)
  }

  return bytesToUtf8(payload).trim()
}

export const extractLinkedOrderCodeFromNfcTag = tag => {
  const ndefMessage = Array.isArray(tag?.ndefMessage) ? tag.ndefMessage : []

  for (const record of ndefMessage) {
    const decodedRecord = decodeNdefRecord(record)

    if (decodedRecord) {
      return decodedRecord
    }
  }

  const tagId = String(tag?.id || tag?.identifier || tag?.serialNumber || '').trim()
  if (tagId) {
    return tagId
  }

  return ''
}
