const {jest} = require('@jest/globals')
const mockDisk = new Map()
jest.mock('@controleonline/ui-common/src/api/localDB', () => ({__esModule: true, default: class {
 async get(id) {return mockDisk.get(id)}
 async saveItem(value) {mockDisk.set(value.id, JSON.parse(JSON.stringify(value)))}
}}))
const createCache = () => {
 let cache
 jest.isolateModules(() => {cache = require('../../../../store/orders/tabConsultationCache')})
 return cache
}
afterEach(() => {delete global.localStorage; mockDisk.clear()})
it('restores persisted IndexedDB records after module memory is recreated', async () => {
 const first = createCache(); const id = first.consultationCacheKey('scope', 'digest')
 await first.writeConsultationCache({id, snapshot: {rootOrder: {price: 98}, descendants: [{id: 2, orderProducts: [{id: 20}]}]}})
 expect(mockDisk.get(id).snapshot.descendants[0].orderProducts).toEqual([{id: 20}])
 const second = createCache()
 expect((await second.readConsultationCache(id)).snapshot.rootOrder.price).toBe(98)
 expect(await second.readConsultationCache(second.consultationCacheKey('other-company', 'digest'))).toBeNull()
 expect(await second.readConsultationCache(second.consultationCacheKey('scope', 'another-session'))).toBeNull()
})
it('uses the existing localStorage bridge when IndexedDB is unavailable on native', async () => {
 const saved = new Map()
 global.localStorage = {getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value)}
 const first = createCache(); const record = {id: 'native-record', snapshot: {rootOrder: {id: 1}}}
 await first.writeConsultationCache(record)
 const second = createCache()
 expect(await second.readConsultationCache(record.id)).toEqual(record)
 expect(mockDisk.size).toBe(0)
})
it('keeps memory usable if persistence fails and detaches it from later source mutations', async () => {
 global.localStorage = {getItem: () => {throw new Error('blocked')}, setItem: () => {throw new Error('quota')}}
 const cache = createCache(); const record = {id: 'blocked', snapshot: {descendants: [{id: 2}]}}
 await cache.writeConsultationCache(record); record.snapshot.descendants[0].id = 99
 expect((await cache.readConsultationCache('blocked')).snapshot.descendants[0].id).toBe(2)
})
