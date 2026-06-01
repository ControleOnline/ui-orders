/*
 * Regra de negocio: no 99Food o codigo operacional já vem pronto no payload.
 * Nao adivinhar nome de campo nem criar fallback: pegar o primeiro valor
 * util de `extraData`/`extra_data` no contexto `Food99`.
 */
import {
  getExtraDataList,
  normalizeText,
  normalizeKey,
} from './shared'

export const FOOD99_APP_KEYS = ['99', '99food', '99 food', 'food99']
export const FOOD99_LABEL = '99'

const FOOD99_CONTEXT_KEYS = FOOD99_APP_KEYS.map(normalizeKey)

const resolveFirstFood99ExtraDataValue = order => {
  for (const extraData of getExtraDataList(order)) {
    const context = normalizeKey(
      extraData?.extra_fields?.context || extraData?.extraFields?.context,
    )

    if (!FOOD99_CONTEXT_KEYS.includes(context)) {
      continue
    }

    const value = normalizeText(extraData?.value)
    if (value) {
      return value
    }
  }

  return ''
}

export const resolveFood99OrderCode = order =>
  normalizeText(resolveFirstFood99ExtraDataValue(order))
