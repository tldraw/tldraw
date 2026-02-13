import { TLSyncErrorCloseEventReason } from './TLSyncClient'

/**
 * Specialized error class for synchronization-related failures in tldraw collaboration.
 *
 * This error is thrown when the sync client encounters fatal errors that prevent
 * successful synchronization with the server. It captures both the error message
 * and the specific reason code that triggered the failure.
 *
 * Common scenarios include schema version mismatches, authentication failures,
 * network connectivity issues, and server-side validation errors.
 *
 * @example
 * ```ts
 * import { TLRemoteSyncError, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
 *
 * // Handle sync errors in your application
 * syncClient.onSyncError((error) => {
 *   if (error instanceof TLRemoteSyncError) {
 *     switch (error.reason) {
 *       case TLSyncErrorCloseEventReason.NOT_AUTHENTICATED:
 *         // Redirect user to login
 *         break
 *       case TLSyncErrorCloseEventReason.CLIENT_TOO_OLD:
 *         // Show update required message
 *         break
 *       default:
 *         console.error('Sync error:', error.message)
 *     }
 *   }
 * })
 * ```
 *
 * @example
 * ```ts
 * // Server-side: throwing a sync error
 * if (!hasPermission(userId, roomId)) {
 *   throw new TLRemoteSyncError(TLSyncErrorCloseEventReason.FORBIDDEN)
 * }
 * ```
 *
 * @public
 */
export class TLRemoteSyncError extends Error {
	override name = 'RemoteSyncError'

	/**
	 * Creates a new TLRemoteSyncError with the specified reason.
	 *
	 * reason - The specific reason code or custom string describing why the sync failed.
	 *                 When using predefined reasons from TLSyncErrorCloseEventReason, the client
	 *                 can handle specific error types appropriately. Custom strings allow for
	 *                 application-specific error details.
	 */
	constructor(public readonly reason: TLSyncErrorCloseEventReason | string) {
		super(`sync error: ${reason}`)
	}
}
