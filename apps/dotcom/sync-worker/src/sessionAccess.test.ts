import { describe, expect, it, vi } from 'vitest'
import { TLFileDurableObject } from './TLFileDurableObject'

vi.mock('cloudflare:workers', () => ({ DurableObject: class {} }))
vi.mock('@tldraw/sync-core', async (original) => ({
	...(await original<typeof import('@tldraw/sync-core')>()),
	TLSocketRoom: class {
		handleSocketResume = vi.fn()
		updateSessionAccess = vi.fn()
		getSessionSnapshot = vi.fn(() => null)
		constructor(readonly options: any) {}
	},
}))

function socket(attachment: unknown) {
	let value = attachment
	return {
		deserializeAttachment: () => value,
		serializeAttachment: vi.fn((next: unknown) => {
			value = next
		}),
	}
}

async function boot(sockets: ReturnType<typeof socket>[]) {
	const object = Object.assign(Object.create(TLFileDurableObject.prototype), {
		_documentInfo: { slug: 'file-id' },
		id: { toString: () => 'durable-object-id' },
		env: { WORKER_NAME: 'test-worker' },
		measure: { writeDataPoint: vi.fn() },
		state: { getWebSockets: () => sockets, waitUntil: vi.fn() },
		sessionIdToWs: new Map(),
		getStorage: async () => ({}),
		maybeAssociateFileAssets: vi.fn(),
	})
	return { object, room: await object.getRoom() }
}

const snapshot = { serializedSchema: {}, presenceId: null, presenceRecord: null }
const meta = { storeId: 'store', userId: 'alice' }

describe('file room session access across hibernation', () => {
	it('resumes attachments written before permissions with the access their fields granted', async () => {
		const { room } = await boot([
			socket({ sessionId: 'rw', meta, isReadonly: false, objectAccess: 'write', snapshot }),
			socket({ sessionId: 'ro', meta, isReadonly: true, objectAccess: 'write', snapshot }),
			socket({
				sessionId: 'anon',
				meta: { storeId: 'store', userId: null },
				isReadonly: false,
				objectAccess: 'read',
				snapshot,
			}),
		])
		expect(
			room.handleSocketResume.mock.calls.map(([resume]: any) => [
				resume.sessionId,
				resume.snapshot.access,
			])
		).toEqual([
			['rw', { userId: 'alice', abilities: ['edit', 'comment'] }],
			['ro', { userId: 'alice', abilities: [] }],
			['anon', { userId: null, abilities: ['edit'] }],
		])
	})

	it('resumes a snapshot with its own access', async () => {
		const access = { userId: 'alice', abilities: ['comment'] }
		const { room } = await boot([
			socket({ sessionId: 's1', meta, access, snapshot: { ...snapshot, access } }),
		])
		expect(room.handleSocketResume.mock.calls[0][0].snapshot.access).toBe(access)
	})

	it('stores changed access with the socket so hibernation does not restore the old one', async () => {
		const access = { userId: 'alice', abilities: ['edit', 'comment'] }
		const ws = socket({ sessionId: 's1', meta, access, snapshot: { ...snapshot, access } })
		const { object, room } = await boot([])
		object.sessionIdToWs.set('s1', ws)
		const readonly = { userId: 'alice', abilities: [] }
		object.updateSessionAccess(room, 's1', readonly)
		expect(room.updateSessionAccess).toHaveBeenCalledWith('s1', readonly)
		// the real room rewrites the snapshot through onSessionSnapshot (tested in sync-core); the
		// worker keeps the attachment's own access in step
		expect(ws.deserializeAttachment()).toMatchObject({ sessionId: 's1', meta, access: readonly })
	})
})
