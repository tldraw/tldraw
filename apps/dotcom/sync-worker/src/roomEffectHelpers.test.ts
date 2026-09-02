import { TlaFile } from '@tldraw/dotcom-shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RoomNotFoundError, settleWithin, shouldSkipMissingRoomEffect } from './roomEffectHelpers'

function file(partial: Partial<TlaFile>): TlaFile {
	return {
		id: 'f1',
		name: 'file',
		ownerId: 'u1',
		ownerName: '',
		ownerAvatar: '',
		thumbnail: '',
		shared: true,
		sharedLinkType: 'edit',
		published: false,
		lastPublished: 0,
		publishedSlug: 'slug-1',
		createdAt: 0,
		updatedAt: 0,
		isEmpty: false,
		isDeleted: false,
		createSource: null,
		owningGroupId: null,
		...partial,
	}
}

describe('shouldSkipMissingRoomEffect', () => {
	it('skips a RoomNotFoundError for a deleted file', () => {
		expect(
			shouldSkipMissingRoomEffect(new RoomNotFoundError('f1'), file({ isDeleted: true }))
		).toBe(true)
	})

	it('does not skip a RoomNotFoundError for a live file', () => {
		expect(
			shouldSkipMissingRoomEffect(new RoomNotFoundError('f1'), file({ isDeleted: false }))
		).toBe(false)
	})

	it('does not skip a different error for a deleted file', () => {
		expect(shouldSkipMissingRoomEffect(new Error('boom'), file({ isDeleted: true }))).toBe(false)
	})
})

describe('settleWithin', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it('resolves settled when the promise resolves in time', async () => {
		const result = settleWithin(Promise.resolve('done'), 1000)
		await expect(result).resolves.toBe('settled')
	})

	it('resolves settled when the promise rejects in time', async () => {
		const result = settleWithin(Promise.reject(new Error('boom')), 1000)
		await expect(result).resolves.toBe('settled')
	})

	it('resolves timeout when the promise is still pending', async () => {
		const result = settleWithin(new Promise(() => {}), 1000)
		vi.advanceTimersByTime(1000)
		await expect(result).resolves.toBe('timeout')
	})

	it('swallows a rejection that lands after the timeout', async () => {
		let reject!: (e: Error) => void
		const pending = new Promise((_, r) => {
			reject = r
		})
		const result = settleWithin(pending, 1000)
		vi.advanceTimersByTime(1000)
		await expect(result).resolves.toBe('timeout')
		reject(new Error('late'))
		// A late rejection must not become an unhandled rejection.
		await vi.runAllTimersAsync()
	})
})
