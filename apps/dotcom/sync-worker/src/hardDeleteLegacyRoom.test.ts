import { ExecutionQueue } from '@tldraw/utils'
import { describe, expect, it, vi } from 'vitest'
import { TLFileDurableObject } from './TLFileDurableObject'

vi.mock('cloudflare:workers', () => ({ DurableObject: class {} }))
vi.mock('./versionChainRead', async (original) => ({
	...(await original<typeof import('./versionChainRead')>()),
	deleteAllVersions: vi.fn(async () => {}),
}))

function harness() {
	const saved = new Map<string, unknown>([['records', 'every record in the room']])
	const calls: string[] = []
	const storage = {
		get: async (key: string) => saved.get(key),
		put: async (key: string, value: unknown) => {
			saved.set(key, value)
		},
		deleteAll: async () => {
			calls.push('deleteAll')
			saved.clear()
		},
		deleteAlarm: async () => {
			calls.push('deleteAlarm')
		},
	}
	const object = Object.assign(Object.create(TLFileDurableObject.prototype), {
		_documentInfo: { version: 0, slug: 'legacy-slug', isApp: false, deleted: false },
		_storage: Promise.resolve({}),
		_room: null,
		executionQueue: new ExecutionQueue(),
		env: { ROOMS: { delete: vi.fn(async () => {}) } },
		ctx: { storage, getWebSockets: () => [] },
		storage,
		closeAllSocketsForDelete: async () => {},
		dropBootTimings: () => {},
	}) as TLFileDurableObject
	return { object, saved, calls }
}

describe('__admin__hardDeleteIfLegacy', () => {
	it('wipes durable object storage but keeps the room marked deleted', async () => {
		const { object, saved, calls } = harness()

		expect(await object.__admin__hardDeleteIfLegacy()).toBe(true)

		expect(calls).toEqual(['deleteAlarm', 'deleteAll'])
		expect((object as any)._storage).toBeNull()
		expect([...saved.keys()]).toEqual(['documentInfo'])
		expect(saved.get('documentInfo')).toMatchObject({
			slug: 'legacy-slug',
			isApp: false,
			deleted: true,
		})
	})
})
