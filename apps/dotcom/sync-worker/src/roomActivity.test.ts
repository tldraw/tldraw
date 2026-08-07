import { describe, expect, it, vi } from 'vitest'
import { getR2KeyForRoomActivity, readRoomActivity } from './roomActivity'

function makeEnv(getImpl: (key: string) => Promise<any>) {
	return { ROOMS: { get: vi.fn(getImpl) } } as any
}

describe('getR2KeyForRoomActivity', () => {
	it('namespaces activity objects away from room snapshots', () => {
		expect(getR2KeyForRoomActivity('my-file')).toBe('app_rooms_activity/my-file')
	})
})

describe('readRoomActivity', () => {
	it('reads a valid activity object', async () => {
		const activity = { activeSessions: 2, documentClock: 17, updatedAt: 123 }
		const env = makeEnv(async () => ({ json: async () => activity }))
		expect(await readRoomActivity(env, 'my-file')).toEqual(activity)
		expect(env.ROOMS.get).toHaveBeenCalledWith('app_rooms_activity/my-file')
	})

	it('returns null for a missing object — absence means idle', async () => {
		const env = makeEnv(async () => null)
		expect(await readRoomActivity(env, 'my-file')).toBeNull()
	})

	it('returns null for an unparseable object', async () => {
		const env = makeEnv(async () => ({
			json: async () => {
				throw new Error('bad json')
			},
		}))
		expect(await readRoomActivity(env, 'my-file')).toBeNull()
	})

	it('returns null for a malformed object', async () => {
		const env = makeEnv(async () => ({ json: async () => ({ nope: true }) }))
		expect(await readRoomActivity(env, 'my-file')).toBeNull()
	})

	it('returns null when R2 itself fails', async () => {
		const env = makeEnv(async () => {
			throw new Error('r2 down')
		})
		expect(await readRoomActivity(env, 'my-file')).toBeNull()
	})
})
