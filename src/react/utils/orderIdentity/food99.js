/*
 * Regra de negocio: no 99Food o identificador exibido e o `code`.
 * O `id` remoto continua existindo como dado tecnico, mas a visualizacao
 * deve ler somente o campo `code` de `extraData`/`extra_data` no contexto
 * `Food99`. Nao adivinhar nem usar fallback.
 */
import {
  getExtraDataList,
  normalizeText,
  normalizeKey,
} from './shared'

export const FOOD99_APP_KEYS = ['99', '99food', '99 food', 'food99']
export const FOOD99_LABEL = '99'

const FOOD99_CONTEXT_KEYS = FOOD99_APP_KEYS.map(normalizeKey)

const resolveFood99CodeFromExtraData = order => {
  for (const extraData of getExtraDataList(order)) {
    const context = normalizeKey(
      extraData?.extra_fields?.context || extraData?.extraFields?.context,
    )

    if (!FOOD99_CONTEXT_KEYS.includes(context)) {
      continue
    }

    const name = normalizeKey(
      extraData?.extra_fields?.name || extraData?.extraFields?.name,
    )

    if (name !== 'code') {
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
  normalizeText(resolveFood99CodeFromExtraData(order))
