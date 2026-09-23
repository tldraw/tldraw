import { TLRemoteSyncError, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import { describe, expect, it } from 'vitest'
import { CachedFileVisitInput, resolveCachedFileVisit } from './cachedFileVisit'

const base: CachedFileVisitInput = {
	status: 'loading',
	appLoaded: false,
	hasFileState: false,
}

const notFound = new TLRemoteSyncError(TLSyncErrorCloseEventReason.NOT_FOUND)
const forbidden = new TLRemoteSyncError(TLSyncErrorCloseEventReason.FORBIDDEN)
const rateLimited = new TLRemoteSyncError(TLSyncErrorCloseEventReason.RATE_LIMITED)

describe('resolveCachedFileVisit', () => {
	it('waits while neither the room nor Zero has answered', () => {
		expect(resolveCachedFileVisit(base)).toEqual({ kind: 'pending' })
	})

	it('waits for Zero even once the room has synced', () => {
		expect(resolveCachedFileVisit({ ...base, status: 'synced-remote' })).toEqual({
			kind: 'pending',
		})
	})

	it('waits for the room once Zero has the file', () => {
		expect(resolveCachedFileVisit({ ...base, appLoaded: true, hasFileState: true })).toEqual({
			kind: 'pending',
		})
	})

	it('falls back as soon as the room says the file is gone, without waiting for Zero', () => {
		expect(resolveCachedFileVisit({ ...base, status: 'error', error: notFound })).toEqual({
			kind: 'fall-back',
		})
		expect(resolveCachedFileVisit({ ...base, status: 'error', error: forbidden })).toEqual({
			kind: 'fall-back',
		})
	})

	it('falls back when Zero has no file_state, even though the room admitted us', () => {
		expect(
			resolveCachedFileVisit({
				...base,
				status: 'synced-remote',
				appLoaded: true,
				hasFileState: false,
			})
		).toEqual({ kind: 'fall-back' })
	})

	it('leaves other room errors to the normal error page', () => {
		expect(
			resolveCachedFileVisit({
				...base,
				status: 'error',
				error: rateLimited,
				appLoaded: true,
				hasFileState: true,
			})
		).toEqual({ kind: 'pending' })
	})

	it('accepts once both the room and Zero have the file', () => {
		expect(
			resolveCachedFileVisit({
				...base,
				status: 'synced-remote',
				appLoaded: true,
				hasFileState: true,
			})
		).toEqual({ kind: 'accepted' })
	})
})
