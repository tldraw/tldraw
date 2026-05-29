import { TLRecord } from '@tldraw/tlschema'
import { TLSocketClientSentEvent, TLSocketServerSentEvent } from '../protocol'
import { TLPersistentClientSocketStatus } from '../TLSyncClient'

/**
 * Subset of `BroadcastChannel` used by the cross-tab machinery. Defined as
 * an interface so tests can inject a mock that gossips between in-process
 * instances.
 *
 * @internal
 */
export interface BroadcastChannelLike {
	postMessage(msg: any): void
	close(): void
	addEventListener(type: 'message', handler: (ev: MessageEvent) => void): void
	removeEventListener(type: 'message', handler: (ev: MessageEvent) => void): void
}

/**
 * Subset of `navigator.locks` used by the cross-tab machinery.
 *
 * @internal
 */
export interface CrossTabLockManager {
	request(
		name: string,
		options: { mode: 'exclusive'; signal?: AbortSignal },
		callback: () => Promise<unknown>
	): Promise<unknown>
}

/**
 * Browser-state hooks the cross-tab machinery uses to react to focus and
 * visibility changes. Pulled out as an interface so tests can drive them
 * deterministically; in production we wrap `window` and `document`.
 *
 * Focus drives the **presenter** role (the tab whose cursor moves should be
 * broadcast). Visibility drives **leader handoff** (a hidden leader can't
 * keep the socket healthy because background-tab timer throttling clamps the
 * ping interval, so the lock should migrate to a visible tab).
 *
 * @internal
 */
export interface BrowserContext {
	/** Whether the window currently has keyboard focus. */
	hasFocus(): boolean
	/**
	 * Whether the document is currently visible (not in a background tab
	 * strip, minimized window, etc).
	 */
	isVisible(): boolean
	/** Subscribe to window `focus` events. Returns an unsubscribe function. */
	onFocus(cb: () => void): () => void
	/**
	 * Subscribe to document `visibilitychange` events. Returns an unsubscribe
	 * function.
	 */
	onVisibilityChange(cb: () => void): () => void
}

/**
 * Status handshake between the leader and its followers. The leader
 * announces the shared socket's connection status; a newly-joined follower
 * says hello so the leader re-announces, letting the follower leave
 * `'initial'` immediately instead of waiting for the next status change.
 *
 * @internal
 */
export type StatusMessage =
	| { _ct: 'leader-status'; status: TLPersistentClientSocketStatus; reason?: string }
	| { _ct: 'follower-hello'; fromTabId: string }

/**
 * Relays the shared socket's traffic between the leader and its followers.
 * Followers send `client` messages for the leader to forward; the leader
 * sends server messages back, either to every tab (`server-all`), to one
 * specific tab (`server-to`), or to everyone except the originator
 * (`server-broadcast-except`, used for synthesized sibling patches).
 *
 * @internal
 */
export type TransportMessage =
	| { _ct: 'client'; fromTabId: string; msg: TLSocketClientSentEvent<TLRecord> }
	| { _ct: 'server-all'; msg: TLSocketServerSentEvent<TLRecord> }
	| { _ct: 'server-to'; toTabId: string; msg: TLSocketServerSentEvent<TLRecord> }
	| {
			_ct: 'server-broadcast-except'
			exceptTabId: string
			msg: TLSocketServerSentEvent<TLRecord>
	  }

/**
 * Presenter election — picks the single tab whose presence (cursor) is
 * pushed to the server.
 *
 * @internal
 */
export type PresenceMessage =
	/**
	 * Sent on `focus` events. The pair `(claim, tabId)` orders all presenter
	 * claims in the pool — the highest tuple wins. Claims use a monotonic
	 * counter bumped past the highest seen value, so out-of-order delivery
	 * over the channel doesn't matter.
	 */
	{ _ct: 'presenter-claim'; tabId: string; claim: number }

/**
 * Visibility-driven leader handoff — lets a hidden leader release the
 * socket to a visible peer.
 *
 * @internal
 */
export type LeadershipMessage =
	/**
	 * Sent on `visibilitychange` (and once on construction). Lets each tab
	 * maintain a set of currently-visible peers so the leader knows whether
	 * to release its lock when it becomes hidden.
	 */
	| { _ct: 'visibility'; tabId: string; visible: boolean }
	/**
	 * Asks all peers to broadcast their current visibility, so a tab joining
	 * mid-session can populate its peer-visibility set without waiting for
	 * the next `visibilitychange`.
	 */
	| { _ct: 'visibility-request'; fromTabId: string }

/**
 * Internal channel message envelope. The `_ct` tag namespaces our messages
 * so a future user of the same channel doesn't accidentally trip our
 * handlers. Grouped into per-concern sub-unions ({@link StatusMessage},
 * {@link TransportMessage}, {@link PresenceMessage}, {@link LeadershipMessage})
 * so it's clear which module owns which arms.
 *
 * @internal
 */
export type CrossTabMessage =
	| StatusMessage
	| TransportMessage
	| PresenceMessage
	| LeadershipMessage

/**
 * Thin typed wrapper over {@link BroadcastChannelLike}. Modules subscribe
 * independently and filter by message type, instead of one giant switch.
 *
 * @internal
 */
export interface CrossTabChannel {
	send(msg: CrossTabMessage): void
	subscribe(handler: (msg: CrossTabMessage) => void): () => void
	close(): void
}
