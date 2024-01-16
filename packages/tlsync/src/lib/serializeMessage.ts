import { TLSocketClientSentEvent, TLSocketServerSentEvent } from './protocol'

type Message = TLSocketServerSentEvent<any> | TLSocketClientSentEvent<any>

let _lastSentMessage: Message | null = null
let _lastSentMessageSerialized: string | null = null

/**
 * Serializes a message to a string. Caches the last serialized message to optimize for cases where
 * the same message is broadcast to multiple places.
 *
 * @public
 */
export function serializeMessage(message: Message) {
	if (message === _lastSentMessage) {
		return _lastSentMessageSerialized as string
	} else {
		_lastSentMessage = message
		_lastSentMessageSerialized = JSON.stringify(message)
		return _lastSentMessageSerialized
	}
}
