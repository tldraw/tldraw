import { TLPersistentClientSocketStatus, TLSocketStatusChangeEvent } from '../TLSyncClient'
import { CrossTabMessage } from './types'

/** The `leader-status` arm of {@link CrossTabMessage}. @internal */
export type LeaderStatusMessage = Extract<CrossTabMessage, { _ct: 'leader-status' }>

/**
 * Convert a {@link TLSocketStatusChangeEvent} into the `leader-status`
 * channel message the leader broadcasts to followers. Only the `'error'`
 * variant carries a `reason`, so non-error statuses drop it.
 *
 * @internal
 */
export function statusEventToMessage(ev: TLSocketStatusChangeEvent): LeaderStatusMessage {
	return {
		_ct: 'leader-status',
		status: ev.status,
		reason: ev.status === 'error' ? ev.reason : undefined,
	}
}

/**
 * Reconstruct a {@link TLSocketStatusChangeEvent} from a received
 * `leader-status` channel message. The event's `'error'` variant requires a
 * `reason`, so fall back to a placeholder if the wire message somehow lacks
 * one.
 *
 * @internal
 */
export function messageToStatusEvent(msg: LeaderStatusMessage): TLSocketStatusChangeEvent {
	return msg.status === 'error'
		? { status: 'error', reason: msg.reason ?? 'unknown' }
		: { status: msg.status }
}

/**
 * Build a {@link TLSocketStatusChangeEvent} from a bare status value — used
 * when synthesizing an initial event from a freshly created socket, where no
 * `reason` is available. A socket shouldn't start in `'error'`, but if it
 * does we use a placeholder reason rather than crash.
 *
 * @internal
 */
export function toStatusChangeEvent(
	status: TLPersistentClientSocketStatus
): TLSocketStatusChangeEvent {
	return messageToStatusEvent({ _ct: 'leader-status', status })
}
