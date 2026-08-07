import { describe, expect, it, vi } from 'vitest'

const mockGetAuth = vi.fn(async (): Promise<any> => null)
vi.mock('../../utils/tla/getAuth', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../utils/tla/getAuth')>()
	return { ...actual, getAuth: () => mockGetAuth() }
})

const mockLoadComments = vi.fn(async () => ({ documents: [] as any[], clockFloor: 0 }))
vi.mock('../../commentRows', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../commentRows')>()
	return { ...actual, loadLiveCommentDocuments: () => mockLoadComments() }
})

let currentFileRow: any
vi.mock('../../postgres', () => ({
	createPostgresConnectionPool: () => {
		const chain: any = {
			selectFrom: vi.fn(() => chain),
			selectAll: vi.fn(() => chain),
			select: vi.fn(() => chain),
			where: vi.fn(() => chain),
			executeTakeFirst: vi.fn(async () => currentFileRow),
			execute: vi.fn(async () => []),
			destroy: vi.fn(async () => {}),
		}
		return chain
	},
}))

import { getLazyFileSnapshot } from './getLazyFileSnapshot'

function makeRoomSnapshot() {
	return {
		documents: [{ state: { id: 'shape:a', typeName: 'shape' }, lastChangedClock: 3 }],
		clock: 10,
		documentClock: 10,
		tombstones: { 'shape:gone': 5 },
		tombstoneHistoryStartsAtClock: 2,
		schema: { schemaVersion: 2, sequences: {} },
	}
}

function makeEnv({
	r2Snapshot = makeRoomSnapshot() as any,
	rateLimited = false,
}: { r2Snapshot?: any; rateLimited?: boolean } = {}) {
	return {
		ROOMS: {
			get: vi.fn(async () => (r2Snapshot ? { json: async () => r2Snapshot } : null)),
		},
		RATE_LIMITER: { limit: vi.fn(async () => ({ success: !rateLimited })) },
	} as any
}

function makeRequest(roomId = 'file-1') {
	return { params: { roomId }, headers: new Headers() } as any
}

function makeFileRow(overrides: any = {}) {
	return {
		id: 'file-1',
		name: 'My board',
		ownerId: 'user-1',
		owningGroupId: null,
		shared: true,
		sharedLinkType: 'view',
		isDeleted: false,
		...overrides,
	}
}

describe('getLazyFileSnapshot', () => {
	it('serves the snapshot with clocks, access bits, and no-store caching', async () => {
		currentFileRow = makeFileRow()
		mockGetAuth.mockResolvedValueOnce({ userId: 'user-2' })
		const env = makeEnv()

		const res = await getLazyFileSnapshot(makeRequest(), env)
		expect(res.status).toBe(200)
		expect(res.headers.get('Cache-Control')).toBe('no-store')
		const body: any = await res.json()
		expect(body.snapshot.documentClock).toBe(10)
		expect(body.snapshot.tombstoneHistoryStartsAtClock).toBe(2)
		// tombstones are server-internal and can be large; a fresh reader has no use for them
		expect(body.snapshot.tombstones).toBeUndefined()
		expect(body.isReadonly).toBe(true)
		expect(body.objectAccess).toBe('write')
		expect(body.fileName).toBe('My board')
	})

	it('merges comment documents from Postgres into the snapshot', async () => {
		currentFileRow = makeFileRow()
		mockGetAuth.mockResolvedValueOnce({ userId: 'user-2' })
		mockLoadComments.mockResolvedValueOnce({
			documents: [
				{ state: { id: 'comment:c1', typeName: 'comment' } as any, lastChangedClock: 12 },
			],
			clockFloor: 12,
		})
		const env = makeEnv()

		const res = await getLazyFileSnapshot(makeRequest(), env)
		const body: any = await res.json()
		expect(body.snapshot.documents.map((d: any) => d.state.id)).toContain('comment:c1')
		// the merge advances the clocks past the comment rows so a socket upgrade can't regress them
		expect(body.snapshot.documentClock).toBe(12)
	})

	it('404s with a not-persisted marker for files with no R2 object yet', async () => {
		currentFileRow = makeFileRow()
		mockGetAuth.mockResolvedValueOnce({ userId: 'user-2' })
		const env = makeEnv({ r2Snapshot: null })

		const res = await getLazyFileSnapshot(makeRequest(), env)
		expect(res.status).toBe(404)
		expect(await res.json()).toEqual({ error: 'not-persisted' })
	})

	it('404s for an unknown file', async () => {
		currentFileRow = undefined
		const res = await getLazyFileSnapshot(makeRequest(), makeEnv())
		expect(res.status).toBe(404)
		expect(await res.json()).toEqual({ error: 'not-found' })
	})

	it('maps access denials onto status codes', async () => {
		// anonymous caller, unshared file → 401
		currentFileRow = makeFileRow({ shared: false })
		mockGetAuth.mockResolvedValueOnce(null)
		expect((await getLazyFileSnapshot(makeRequest(), makeEnv())).status).toBe(401)

		// signed-in stranger, unshared file → 403
		currentFileRow = makeFileRow({ shared: false })
		mockGetAuth.mockResolvedValueOnce({ userId: 'user-2' })
		expect((await getLazyFileSnapshot(makeRequest(), makeEnv())).status).toBe(403)

		// deleted file → 404
		currentFileRow = makeFileRow({ isDeleted: true })
		mockGetAuth.mockResolvedValueOnce({ userId: 'user-1' })
		expect((await getLazyFileSnapshot(makeRequest(), makeEnv())).status).toBe(404)

		// rate limited → 429
		currentFileRow = makeFileRow()
		mockGetAuth.mockResolvedValueOnce({ userId: 'user-2' })
		expect((await getLazyFileSnapshot(makeRequest(), makeEnv({ rateLimited: true }))).status).toBe(
			429
		)
	})

	it('fails the request when the comments load fails, rather than serving without comments', async () => {
		currentFileRow = makeFileRow()
		mockGetAuth.mockResolvedValueOnce({ userId: 'user-2' })
		mockLoadComments.mockRejectedValueOnce(new Error('pg down'))

		await expect(getLazyFileSnapshot(makeRequest(), makeEnv())).rejects.toThrow('pg down')
	})
})
