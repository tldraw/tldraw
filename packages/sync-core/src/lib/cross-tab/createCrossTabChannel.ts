import { BroadcastChannelLike, CrossTabChannel, CrossTabMessage } from './types'

/**
 * Wrap a raw {@link BroadcastChannelLike} as a {@link CrossTabChannel}. Drops
 * messages that don't match our envelope so a future co-tenant on the same
 * channel name doesn't accidentally trip our handlers.
 *
 * @internal
 */
export function createCrossTabChannel(bc: BroadcastChannelLike): CrossTabChannel {
	const handlers = new Set<(msg: CrossTabMessage) => void>()
	function onMessage(ev: MessageEvent) {
		const data = ev.data
		if (!data || typeof data !== 'object' || !('_ct' in data)) return
		handlers.forEach((h) => h(data as CrossTabMessage))
	}
	bc.addEventListener('message', onMessage)
	return {
		send(msg) {
			bc.postMessage(msg)
		},
		subscribe(handler) {
			handlers.add(handler)
			return () => {
				handlers.delete(handler)
			}
		},
		close() {
			bc.removeEventListener('message', onMessage)
			bc.close()
			handlers.clear()
		},
	}
}
