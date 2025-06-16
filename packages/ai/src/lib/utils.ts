import { TLAiMessage, TLAiMessages } from './types'

/** @public */
export function asMessage(message: TLAiMessages): TLAiMessage[] {
	if (Array.isArray(message)) return message
	if (typeof message === 'string') return [{ type: 'text', text: message }]
	return [message]
}
