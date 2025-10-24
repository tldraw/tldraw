import z from 'zod'
import { AgentMessage, AgentMessageContent } from '../../types/AgentMessage'
import { ChatHistoryItem } from '../../types/ChatHistoryItem'
import { PromptPartRegistry } from '../PromptPartRegistry'

export type ChatHistoryPart = z.infer<typeof ChatHistoryPartSchema>
export const ChatHistoryPartSchema = z.object({
	type: z.literal('chatHistory'),
	items: z.array(z.any()).nullable(),
})

ChatHistoryPartSchema.register(PromptPartRegistry, {
	priority: -Infinity,
	buildMessages({ items }: ChatHistoryPart) {
		if (!items) return []

		const messages: AgentMessage[] = []
		const priority = -Infinity

		// If the last message is from the user, skip it
		const lastIndex = items.length - 1
		let end = items.length
		if (end > 0 && items[lastIndex].type === 'prompt') {
			end = lastIndex
		}

		for (let i = 0; i < end; i++) {
			const item = items[i]
			const message = buildHistoryItemMessage(item, priority)
			if (message) messages.push(message)
		}

		return messages
	},
})

function buildHistoryItemMessage(item: ChatHistoryItem, priority: number): AgentMessage | null {
	switch (item.type) {
		case 'prompt': {
			const content: AgentMessageContent[] = []

			if (item.message.trim() !== '') {
				content.push({
					type: 'text',
					text: item.message,
				})
			}

			if (item.contextItems.length > 0) {
				for (const contextItem of item.contextItems) {
					switch (contextItem.type) {
						case 'shape': {
							const simpleShape = contextItem.shape
							content.push({
								type: 'text',
								text: `[CONTEXT]: ${JSON.stringify(simpleShape)}`,
							})
							break
						}
						case 'shapes': {
							const simpleShapes = contextItem.shapes
							content.push({
								type: 'text',
								text: `[CONTEXT]: ${JSON.stringify(simpleShapes)}`,
							})
							break
						}
						default: {
							content.push({
								type: 'text',
								text: `[CONTEXT]: ${JSON.stringify(contextItem)}`,
							})
							break
						}
					}
				}
			}

			if (content.length === 0) {
				return null
			}

			return {
				role: 'user',
				content,
				priority,
			}
		}
		case 'continuation': {
			if (item.data.length === 0) {
				return null
			}
			const text = `[DATA RETRIEVED]: ${JSON.stringify(item.data)}`
			return {
				role: 'assistant',
				content: [{ type: 'text', text }],
				priority,
			}
		}
		case 'action': {
			const { action } = item
			let text: string
			switch (action._type) {
				case 'message': {
					text = action.text || '<message data lost>'
					break
				}
				case 'think': {
					text = '[THOUGHT]: ' + (action.text || '<thought data lost>')
					break
				}
				default: {
					const { complete: _complete, time: _time, ...rawAction } = action || {}
					text = '[ACTION]: ' + JSON.stringify(rawAction)
					break
				}
			}
			return {
				role: 'assistant',
				content: [{ type: 'text', text }],
				priority,
			}
		}
	}
}
