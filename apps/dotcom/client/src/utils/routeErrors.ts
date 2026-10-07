import { captureException } from '@sentry/react'
import type { TLRemoteSyncError, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import { TlaNotFoundError } from '../tla/utils/notFoundError'

// Structural, not instanceof: a runtime import of @tldraw/sync-core pulls the store and schema into
// the entry chunk, ahead of first paint.
export function isRemoteSyncError(error: unknown): error is TLRemoteSyncError {
	return error instanceof Error && error.name === 'RemoteSyncError'
}

// Close reasons that describe the visitor or the file, not a fault: each renders its own page. Opening
// a deleted file alone (NOT_FOUND) was the largest tldraw.com Sentry issue by users (#11064).
const EXPECTED_SYNC_ERROR_REASONS: ReadonlySet<string> = new Set<TLSyncErrorCloseEventReason>([
	'NOT_FOUND',
	'NOT_AUTHENTICATED',
	'FORBIDDEN',
	'RATE_LIMITED',
])

export function isExpectedRouteError(error: unknown): boolean {
	if (error instanceof TlaNotFoundError) return true
	return isRemoteSyncError(error) && EXPECTED_SYNC_ERROR_REASONS.has(error.reason)
}

export function captureRouteError(error: unknown) {
	if (isExpectedRouteError(error)) return
	captureException(error)
}
