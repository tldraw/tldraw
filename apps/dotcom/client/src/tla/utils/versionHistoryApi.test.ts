import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchVersionSnapshot, restoreVersion } from './versionHistoryApi'

const mockFetch = vi.fn()
vi.mock('tldraw', () => ({ fetch: (...args: any[]) => mockFetch(...args) }))

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body })

describe('versionHistoryApi', () => {
	beforeEach(() => mockFetch.mockReset())

	it('restoreVersion posts body and parses response', async () => {
		const res = { restoreId: 'r1', preRestoreTs: 't0', restoredTs: 't1' }
		mockFetch.mockResolvedValue(ok(res))
		expect(await restoreVersion('f1', { timestamp: 't', undoes: 'r0' })).toEqual(res)
		expect(mockFetch).toHaveBeenCalledWith('/api/app/file/f1/restore', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ timestamp: 't', undoes: 'r0' }),
		})
	})

	it('non-2xx throws', async () => {
		mockFetch.mockResolvedValue({ ok: false, status: 403, json: async () => ({}) })
		await expect(restoreVersion('f1', { timestamp: 't' })).rejects.toThrow('403')
	})

	it('snapshot conversion keys records by id', async () => {
		mockFetch.mockResolvedValue(
			ok({ schema: { v: 1 }, documents: [{ state: { id: 'shape:a', typeName: 'shape' } }] })
		)
		expect(await fetchVersionSnapshot('f1', 't')).toEqual({
			schema: { v: 1 },
			store: { 'shape:a': { id: 'shape:a', typeName: 'shape' } },
		})
	})
})
