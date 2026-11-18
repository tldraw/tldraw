import { MAX_BOARD_PRESENCE_FILE_IDS } from '@tldraw/dotcom-shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getBoardPresence } from './getBoardPresence'

vi.mock('../../utils/tla/getAuth', () => ({ requireAuth: vi.fn() }))
vi.mock('../../postgres', () => ({ createPostgresConnectionPool: vi.fn() }))
vi.mock('../../utils/durableObjects', () => ({ getRoomDurableObject: vi.fn() }))

const { requireAuth } = await import('../../utils/tla/getAuth')
const { createPostgresConnectionPool } = await import('../../postgres')
const { getRoomDurableObject } = await import('../../utils/durableObjects')

/** The file ids the caller has a file_state row for. */
let visited: string[]
/** Who each board's durable object reports as connected. */
let connected: Record<string, string[]>
let whereCalls: unknown[][]

function makeRequest(body: unknown) {
	return new Request('https://sync.tldraw.xyz/app/board-presence', {
		method: 'POST',
		body: JSON.stringify(body),
	}) as any
}

beforeEach(() => {
	visited = []
	connected = {}
	whereCalls = []
	vi.mocked(requireAuth).mockResolvedValue({ userId: 'user-1' } as any)
	vi.mocked(createPostgresConnectionPool).mockImplementation(() => {
		const query: any = {
			select: () => query,
			where: (...args: unknown[]) => {
				whereCalls.push(args)
				return query
			},
			execute: async () => {
				const requested = whereCalls.find(([col]) => col === 'fileId')?.[2] as string[]
				return requested.filter((id) => visited.includes(id)).map((fileId) => ({ fileId }))
			},
		}
		return { selectFrom: () => query, destroy: vi.fn() } as any
	})
	vi.mocked(getRoomDurableObject).mockImplementation(
		(_env, fileId) => ({ getConnectedUserIds: async () => connected[fileId] ?? [] }) as any
	)
})

afterEach(() => vi.clearAllMocks())

describe('getBoardPresence', () => {
	it('reports who is connected to the boards the caller has opened', async () => {
		visited = ['a', 'b']
		connected = { a: ['user-2', 'user-3'], b: [] }

		const res = await getBoardPresence(makeRequest({ fileIds: ['a', 'b'] }), {} as any)

		expect(res.status).toBe(200)
		expect(await res.json()).toEqual({ presence: { a: ['user-2', 'user-3'] } })
		expect(whereCalls).toContainEqual(['userId', '=', 'user-1'])
	})

	it('never asks the room of a board the caller has not opened', async () => {
		visited = ['a']
		connected = { a: ['user-2'], secret: ['user-9'] }

		const res = await getBoardPresence(makeRequest({ fileIds: ['a', 'secret'] }), {} as any)

		expect(await res.json()).toEqual({ presence: { a: ['user-2'] } })
		expect(getRoomDurableObject).not.toHaveBeenCalledWith(expect.anything(), 'secret')
	})

	it('skips the database for an empty batch', async () => {
		const res = await getBoardPresence(makeRequest({ fileIds: [] }), {} as any)

		expect(await res.json()).toEqual({ presence: {} })
		expect(createPostgresConnectionPool).not.toHaveBeenCalled()
	})

	it('refuses a batch larger than one poll may wake', async () => {
		const fileIds = Array.from({ length: MAX_BOARD_PRESENCE_FILE_IDS + 1 }, (_, i) => `f${i}`)

		const res = await getBoardPresence(makeRequest({ fileIds }), {} as any)

		expect(res.status).toBe(400)
		expect(getRoomDurableObject).not.toHaveBeenCalled()
	})

	it('refuses a body without a fileIds array', async () => {
		const res = await getBoardPresence(makeRequest({ fileIds: 'a' }), {} as any)

		expect(res.status).toBe(400)
	})

	it('refuses a signed-out caller', async () => {
		vi.mocked(requireAuth).mockRejectedValue(
			Object.assign(new Error('Unauthorized'), { status: 401 })
		)

		await expect(
			getBoardPresence(makeRequest({ fileIds: ['a'] }), {} as any)
		).rejects.toMatchObject({ status: 401 })
		expect(createPostgresConnectionPool).not.toHaveBeenCalled()
	})
})
