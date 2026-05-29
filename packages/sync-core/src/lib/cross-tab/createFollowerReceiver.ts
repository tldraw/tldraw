import { TLRecord } from '@tldraw/tlschema'
import { TLSocketServerSentEvent } from '../protocol'
import { TLSocketStatusChangeEvent } from '../TLSyncClient'
import { messageToStatusEvent } from './leaderStatus'
import { CrossTabChannel, CrossTabMessage } from './types'

/** What {@link createFollowerReceiver} returns. */
export interface FollowerReceiver {
	close(): void
}

/**
 * Dispatch channel messages targeted at follower tabs.
 *
 * Listens for:
 * - `leader-status` — applies the leader's WS status to our local
 *   connection-status atom.
 * - `server-all` — server messages broadcast to every tab.
 * - `server-to` — server messages routed specifically to this tab.
 * - `server-broadcast-except` — synthesized sibling patches; this tab
 *   delivers them unless it's the excluded originator.
 *
 * The host (`createCrossTabSocket`) tells us whether this tab is
 * currently leader/fallback via `isLeaderOrFallback()`; leaders ignore
 * channel server messages because they own the underlying socket and
 * receive those messages directly.
 *
 * @internal
 */
export function createFollowerReceiver(opts: {
	tabId: string
	channel: CrossTabChannel
	isLeaderOrFallback(): boolean
	deliverToLocal(msg: TLSocketServerSentEvent<TLRecord>): void
	applyStatus(ev: TLSocketStatusChangeEvent): void
}): FollowerReceiver {
	function onChannelMessage(msg: CrossTabMessage) {
		switch (msg._ct) {
			case 'leader-status':
				if (opts.isLeaderOrFallback()) return
				opts.applyStatus(messageToStatusEvent(msg))
				return
			case 'server-all':
				if (opts.isLeaderOrFallback()) return
				opts.deliverToLocal(msg.msg)
				return
			case 'server-to':
				if (msg.toTabId !== opts.tabId) return
				opts.deliverToLocal(msg.msg)
				return
			case 'server-broadcast-except':
				if (opts.isLeaderOrFallback()) return
				if (msg.exceptTabId === opts.tabId) return
				opts.deliverToLocal(msg.msg)
				return
			default:
				return
		}
	}

	const unsubscribe = opts.channel.subscribe(onChannelMessage)
	return { close: unsubscribe }
}
