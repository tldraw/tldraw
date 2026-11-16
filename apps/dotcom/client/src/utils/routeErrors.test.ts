import { captureException } from '@sentry/react'
import { TLRemoteSyncError, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TlaNotFoundError } from '../tla/utils/notFoundError'
import { captureRouteError } from './routeErrors'

vi.mock('@sentry/react', () => ({ captureException: vi.fn() }))

describe('captureRouteError', () => {
	beforeEach(() => {
		vi.mocked(captureException).mockClear()
	})

	it.each([
		TLSyncErrorCloseEventReason.NOT_FOUND,
		TLSyncErrorCloseEventReason.NOT_AUTHENTICATED,
		TLSyncErrorCloseEventReason.FORBIDDEN,
		TLSyncErrorCloseEventReason.RATE_LIMITED,
		TLSyncErrorCloseEventReason.ROOM_FULL,
		TLSyncErrorCloseEventReason.CLIENT_TOO_OLD,
	])('does not capture a %s sync error, which has its own page', (reason) => {
		captureRouteError(new TLRemoteSyncError(reason))
		expect(captureException).not.toHaveBeenCalled()
	})

	it('does not capture a not found error', () => {
		captureRouteError(new TlaNotFoundError())
		expect(captureException).not.toHaveBeenCalled()
	})

	it.each([
		new TLRemoteSyncError(TLSyncErrorCloseEventReason.UNKNOWN_ERROR),
		new TLRemoteSyncError(TLSyncErrorCloseEventReason.INVALID_RECORD),
		new Error('NOT_FOUND'),
		'NOT_FOUND',
	])('captures an unexpected error: %s', (error) => {
		captureRouteError(error)
		expect(captureException).toHaveBeenCalledWith(error)
	})
})
