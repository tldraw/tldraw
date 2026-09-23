import { TLRemoteSyncError, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'

export interface CachedFileVisitInput {
	/** The file room's sync status. */
	status: 'loading' | 'synced-remote' | 'error'
	error?: unknown
	/** The signed-in app has finished its Zero preload; the two fields below mean nothing before. */
	appLoaded: boolean
	/** Zero has a file_state row for this file. */
	hasFileState: boolean
	/** Zero's most recently visited file across devices, or null with no visits. */
	mostRecentFileId: string | null
	fileId: string
}

export type CachedFileVisit =
	/** Nothing to decide yet. */
	| { kind: 'pending' }
	/** Both the room and Zero accepted the file: the visit is a normal one from here on. */
	| { kind: 'accepted' }
	/** The cache was stale: clear it and let `/` pick from Zero. */
	| { kind: 'fall-back' }
	/** Another device visited a newer file: `/` must land there, as it did before the cache. */
	| { kind: 'redirect'; fileId: string }

/**
 * What to do with a `/f/:slug` visit that `/` redirected to from the local last-file cache, as
 * the room and Zero answer. A cache hit means a prior visit, so a missing file_state means the
 * file was forgotten elsewhere: the room would still admit a link-shared file and `onFileEnter`
 * would re-add it. Other room errors are left to the normal error page.
 */
export function resolveCachedFileVisit(input: CachedFileVisitInput): CachedFileVisit {
	if (input.status === 'error' && isFileGone(input.error)) return { kind: 'fall-back' }
	if (!input.appLoaded) return { kind: 'pending' }
	if (!input.hasFileState) return { kind: 'fall-back' }
	if (input.mostRecentFileId && input.mostRecentFileId !== input.fileId) {
		return { kind: 'redirect', fileId: input.mostRecentFileId }
	}
	if (input.status === 'synced-remote') return { kind: 'accepted' }
	return { kind: 'pending' }
}

function isFileGone(error: unknown) {
	return (
		error instanceof TLRemoteSyncError &&
		(error.reason === TLSyncErrorCloseEventReason.NOT_FOUND ||
			error.reason === TLSyncErrorCloseEventReason.FORBIDDEN)
	)
}
