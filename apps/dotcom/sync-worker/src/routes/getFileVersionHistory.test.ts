import { IRequest } from 'itty-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	getFileVersionHistory,
	getFileVersionPoints,
	saveFileNamedVersion,
} from './getFileVersionHistory'

const getVersionHistory = vi.fn(async () => ({ sessions: [], users: {}, nextCursor: null }))
const getVersionPoints = vi.fn(async () => ({ points: [], users: {} }))
const saveNamedVersion = vi.fn(async () => ({ ts: 't9' }))
const requireHistoryAccess = vi.fn(async () => {})

vi.mock('../utils/durableObjects', () => ({
	getRoomDurableObject: () => ({ getVersionHistory, getVersionPoints, saveNamedVersion }),
}))
vi.mock('../utils/tla/requireHistoryAccess', () => ({
	requireHistoryAccess: (...args: any[]) => (requireHistoryAccess as any)(...args),
}))

const env = {} as any
const request = (query: Record<string, string>) =>
	({ params: { roomId: 'f1' }, query }) as unknown as IRequest

describe('getFileVersionHistory', () => {
	beforeEach(() => vi.clearAllMocks())

	it('forwards before, limit and raw to the durable object', async () => {
		const res = await getFileVersionHistory(request({ before: 't1', limit: '10', raw: '1' }), env)
		expect(res.status).toBe(200)
		expect(requireHistoryAccess).toHaveBeenCalledWith(expect.anything(), env, 'f1', true, {
			raw: true,
		})
		expect(getVersionHistory).toHaveBeenCalledWith({
			fileId: 'f1',
			before: 't1',
			limit: 10,
			raw: true,
		})
	})

	it('points route forwards the range', async () => {
		await getFileVersionPoints(request({ from: 'a', to: 'b' }), env)
		expect(getVersionPoints).toHaveBeenCalledWith({ fileId: 'f1', from: 'a', to: 'b' })
	})

	it('points route needs a range', async () => {
		expect((await getFileVersionPoints(request({}), env)).status).toBe(400)
	})
})

describe('saveFileNamedVersion', () => {
	beforeEach(() => vi.clearAllMocks())
	const post = (body: unknown) =>
		({ params: { roomId: 'f1' }, query: {}, json: async () => body }) as unknown as IRequest

	it('trims the name and saves it for an editor', async () => {
		const res = await saveFileNamedVersion(post({ name: '  Before review  ' }), env)
		expect(await res.json()).toEqual({ ts: 't9' })
		expect(requireHistoryAccess).toHaveBeenCalledWith(expect.anything(), env, 'f1', true)
		expect(saveNamedVersion).toHaveBeenCalledWith({ fileId: 'f1', name: 'Before review' })
	})

	it('rejects an empty name', async () => {
		expect((await saveFileNamedVersion(post({ name: '   ' }), env)).status).toBe(400)
		expect(saveNamedVersion).not.toHaveBeenCalled()
	})
})
