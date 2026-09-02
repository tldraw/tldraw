import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	SharedFileInfo,
	getSharedFileRoomSnapshot,
	isFileAnonymouslyViewable,
	isFileRenderable,
} from './getSharedFile'

function makeFile(overrides: Partial<SharedFileInfo> = {}): SharedFileInfo {
	return { id: 'file-abc', shared: true, isDeleted: false, ...overrides }
}

// The two gates, and the one difference between them: sharing. Rendering happens for every board so
// an owner-facing surface has a thumbnail; serving to an anonymous caller does not.
describe('isFileRenderable', () => {
	it('allows a private file — privacy gates serving, not rendering', () => {
		expect(isFileRenderable(makeFile({ shared: false }))).toBe(true)
		expect(isFileAnonymouslyViewable(makeFile({ shared: false }))).toBe(false)
	})

	it('refuses a missing file', () => {
		expect(isFileRenderable(null)).toBe(false)
	})

	// A deleted board has nothing worth depicting, shared or not.
	it('refuses a deleted file', () => {
		expect(isFileRenderable(makeFile({ isDeleted: true }))).toBe(false)
		expect(isFileRenderable(makeFile({ isDeleted: true, shared: false }))).toBe(false)
	})

	// Reading a test file needs admin auth, so it has no business being pulled through the render page
	// even though nothing would serve the result anonymously.
	it('refuses a test file', () => {
		expect(isFileRenderable(makeFile({ id: 'test_abc' }))).toBe(false)
	})
})

describe('isFileAnonymouslyViewable', () => {
	it('allows a shared, non-deleted, non-test file', () => {
		expect(isFileAnonymouslyViewable(makeFile())).toBe(true)
	})

	it('refuses a missing file', () => {
		expect(isFileAnonymouslyViewable(null)).toBe(false)
	})

	it('refuses a private (unshared) file', () => {
		expect(isFileAnonymouslyViewable(makeFile({ shared: false }))).toBe(false)
	})

	it('refuses a deleted file even if still shared', () => {
		expect(isFileAnonymouslyViewable(makeFile({ isDeleted: true }))).toBe(false)
	})

	it('refuses a test file, which needs admin auth the anonymous tool never has', () => {
		expect(isFileAnonymouslyViewable(makeFile({ id: 'test_abc' }))).toBe(false)
	})
})

// The `file` option on getSharedFileRoomSnapshot. It decides whether the gate runs against a freshly
// read row or one the caller already holds — never whether the gate runs at all. The Postgres pool is
// faked rather than the reader mocked, so these exercise the real query path and can tell a skipped
// round trip from a skipped check.
const pg = vi.hoisted(() => {
	const executeTakeFirst = vi.fn()
	const db: any = {
		selectFrom: () => db,
		select: () => db,
		where: () => db,
		executeTakeFirst,
		destroy: vi.fn(),
	}
	return { db, executeTakeFirst, createPostgresConnectionPool: vi.fn(() => db) }
})

vi.mock('../../postgres', () => ({
	createPostgresConnectionPool: pg.createPostgresConnectionPool,
}))

describe('getSharedFileRoomSnapshot', () => {
	const snapshot = { documents: [], schema: { schemaVersion: 2, sequences: {} } }

	function makeEnv() {
		return { ROOMS: { get: vi.fn().mockResolvedValue({ json: async () => snapshot }) } } as any
	}

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('reads the file row when none is supplied', async () => {
		pg.executeTakeFirst.mockResolvedValue(makeFile())

		await expect(
			getSharedFileRoomSnapshot(makeEnv(), 'file-abc', { access: 'public' })
		).resolves.toEqual(snapshot)
		expect(pg.createPostgresConnectionPool).toHaveBeenCalledTimes(1)
	})

	it('reuses a supplied row instead of asking Postgres again', async () => {
		await expect(
			getSharedFileRoomSnapshot(makeEnv(), 'file-abc', { access: 'public', file: makeFile() })
		).resolves.toEqual(snapshot)
		expect(pg.createPostgresConnectionPool).not.toHaveBeenCalled()
	})

	// The point of the option is to skip the round trip, not the check. A row that fails the gate is
	// refused exactly as a freshly-read one would be, and the snapshot is never read.
	it('still applies the gate to a supplied row', async () => {
		const env = makeEnv()

		await expect(
			getSharedFileRoomSnapshot(env, 'file-abc', {
				access: 'public',
				file: makeFile({ shared: false }),
			})
		).rejects.toThrow('not shared')

		await expect(
			getSharedFileRoomSnapshot(env, 'file-abc', {
				access: 'render',
				file: makeFile({ isDeleted: true }),
			})
		).rejects.toThrow('not renderable')

		expect(pg.createPostgresConnectionPool).not.toHaveBeenCalled()
		expect(env.ROOMS.get).not.toHaveBeenCalled()
	})

	// A supplied row is gated under the *caller's* access level, not whichever one it was resolved
	// under, so handing a render-gated row to a public read cannot widen what that read may see.
	it('refuses a private row supplied to a public read', async () => {
		await expect(
			getSharedFileRoomSnapshot(makeEnv(), 'file-abc', {
				access: 'public',
				file: makeFile({ shared: false }),
			})
		).rejects.toThrow('not shared')
	})
})
