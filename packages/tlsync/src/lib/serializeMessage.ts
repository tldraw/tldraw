import { TLSocketClientSentEvent, TLSocketServerSentEvent } from './protocol'

type Message = TLSocketServerSentEvent<any> | TLSocketClientSentEvent<any>

// It's alright that this cache is unsized, because its size is bound by the number of non-GC'd
// messages, which should be small
const _cache: WeakMap<Message, string> = new WeakMap()

/**
 * Serializes a message to a string. Caches the last serialized message to optimize for cases where
 * the same message is broadcast to multiple places.
 *
 * @public
 */
export function serializeMessage(message: Message | Message[]) {
	if (Array.isArray(message)) {
		// no point caching per-session buffers, they don't duplicate between sessions/sockets
		return JSON.stringify(message)
	}

	const cached = _cache.get(message)
	if (cached !== undefined) {
		return cached
	} else {
		const serialized = JSON.stringify(message)
		_cache.set(message, serialized)
		return serialized
	}
}
