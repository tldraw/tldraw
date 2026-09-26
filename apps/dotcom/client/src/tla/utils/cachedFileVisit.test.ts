import { TLRemoteSyncError, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import { describe, expect, it } from 'vitest'
import { CachedFileVisitInput, resolveCachedFileVisit } from './cachedFileVisit'

const base: CachedFileVisitInput = {
	status: 'loading',
	appLoaded: false,
	hasFileState: false,
	mostRecentFileId: null,
	fileId: 'file-a',
}
const known = { ...base, appLoaded: true, hasFileState: true, mostRecentFileId: 'file-a' }

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
		expect(resolveCachedFileVisit(known)).toEqual({ kind: 'pending' })
	})

	it('redirects to a newer file from another device without waiting for the room', () => {
		expect(resolveCachedFileVisit({ ...known, mostRecentFileId: 'file-b' })).toEqual({
			kind: 'redirect',
			fileId: 'file-b',
		})
	})

	it('still falls back on a forgotten file even if Zero names a most recent one', () => {
		expect(
			resolveCachedFileVisit({ ...known, hasFileState: false, mostRecentFileId: 'file-b' })
		).toEqual({ kind: 'fallback' })
	})

	it('falls back as soon as the room says the file is gone, without waiting for Zero', () => {
		expect(resolveCachedFileVisit({ ...base, status: 'error', error: notFound })).toEqual({
			kind: 'fallback',
		})
		expect(resolveCachedFileVisit({ ...base, status: 'error', error: forbidden })).toEqual({
			kind: 'fallback',
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
		).toEqual({ kind: 'fallback' })
	})

	it('leaves other room errors to the normal error page', () => {
		expect(resolveCachedFileVisit({ ...known, status: 'error', error: rateLimited })).toEqual({
			kind: 'pending',
		})
	})

	it('accepts once both the room and Zero have the file and it is the most recent', () => {
		expect(resolveCachedFileVisit({ ...known, status: 'synced-remote' })).toEqual({
			kind: 'accepted',
		})
	})
})
