import localDB from '@controleonline/ui-common/src/api/localDB'

// Reuse the catalog's localDB/memory pattern. Financial freshness is never cached.
const db = new localDB({resourceEndpoint: 'pos_tab_consultation_cache', columns: [], filters: {}})
const memory = new Map()
const writes = new Map()
export const consultationCacheKey = (scope, session, kind = 'snapshot') =>
  JSON.stringify([1, scope, session, kind])
const nativeKey = id => `pos-tab-consultation:${id}`
const remember = record => {
  memory.set(record.id, record)
  if (memory.size > 100) memory.delete(memory.keys().next().value)
  return record
}
export async function readConsultationCache(id) {
  if (memory.has(id)) return memory.get(id)
  try {
    const record = typeof indexedDB === 'undefined' && typeof localStorage !== 'undefined'
      ? JSON.parse(localStorage.getItem(nativeKey(id)) || 'null') : await db.get(id)
    return record?.id === id ? remember(record) : null
  } catch { return null }
}
export function writeConsultationCache(record) {
  // Detach the persisted value from mutable store objects and exclude request handles.
  let value
  try { value = remember(JSON.parse(JSON.stringify(record))) } catch { return Promise.resolve() }
  const work = (writes.get(value.id) || Promise.resolve()).then(async () => {
    try {
      if (typeof indexedDB === 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(nativeKey(value.id), JSON.stringify(value))
      } else await db.saveItem(value)
    } catch { /* Storage failure retains the in-memory result, like the catalog. */ }
  })
  writes.set(value.id, work)
  void work.finally(() => {if (writes.get(value.id) === work) writes.delete(value.id)})
  return work
}
