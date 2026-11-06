import { Authorize, AuthorizeRequest, runAuthorize } from '@tldraw/store'
import { TLRecord } from '@tldraw/tlschema'
import { SessionMeta } from './authorizeFileRecord'

type Write = { session: { meta: SessionMeta } } & (
	| { type: 'create'; prev: null; next: any }
	| { type: 'update'; prev: any; next: any }
	| { type: 'delete'; prev: any; next: null }
)

/**
 * Calls an `authorize` function in the shape of the old per-type authorizer maps, so that each
 * case reads as before: it returns the stored record, or `null` for a denial. A throw is passed
 * through, so a test can see that telemetry does not swallow it.
 */
export function asAuthorizerMap(authorize: Authorize<TLRecord, SessionMeta>) {
	const call = (write: Write) => {
		const request: AuthorizeRequest<TLRecord> =
			write.type === 'create'
				? { action: 'create', record: write.next }
				: write.type === 'update'
					? { action: 'update', record: write.prev, next: write.next }
					: { action: 'delete', record: write.prev }
		const env = { actor: write.session.meta, get: () => undefined }
		const result = authorize({
			...request,
			...env,
			can: (action, record) =>
				runAuthorize(authorize, { action, record } as AuthorizeRequest<TLRecord>, env).allowed,
		})
		if (result === false || (typeof result === 'object' && result && 'deny' in result)) return null
		if (typeof result === 'object' && result && 'record' in result) return result.record
		return write.type === 'delete' ? write.prev : write.next
	}
	return { shape: call, comment: call, 'comment-thread': call, 'comment-reaction': call }
}
