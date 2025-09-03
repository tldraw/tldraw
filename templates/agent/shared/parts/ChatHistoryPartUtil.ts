import { TldrawAgent } from '../../client/agent/TldrawAgent'
import { AgentRequestTransform } from '../AgentRequestTransform'
import { AgentMessage, AgentMessageContent } from '../types/AgentMessage'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { IChatHistoryItem } from '../types/ChatHistoryItem'
import { PromptPartUtil } from './PromptPartUtil'

export interface ChatHistoryPart extends BasePromptPart<'chatHistory'> {
	items: IChatHistoryItem[]
}

export class ChatHistoryPartUtil extends PromptPartUtil<ChatHistoryPart> {
	static override type = 'chatHistory' as const

	override getPriority() {
		return Infinity // history should appear first in the prompt (low priority)
	}

	override getPart(_request: AgentRequest, agent: TldrawAgent): ChatHistoryPart {
		return {
			type: 'chatHistory',
			items: agent.$chatHistory.get(),
		}
	}

	override transformPart(part: ChatHistoryPart, transform: AgentRequestTransform) {
		for (const historyItem of part.items) {
			console.log('historyItem', historyItem)
			if (historyItem.type !== 'prompt') continue

			// Offset and round the context items of each history item
			const contextItems = historyItem.contextItems.map((contextItem) => {
				const offsetContextItem = transform.applyOffsetToContextItem(contextItem)
				return transform.roundContextItem(offsetContextItem)
			})

			historyItem.contextItems = contextItems
		}
		return part
	}

	override buildMessages({ items }: ChatHistoryPart): AgentMessage[] {
		const messages: AgentMessage[] = []
		const priority = this.getPriority()

		// If the last message is from the user, skip it
		const lastIndex = items.length - 1
		let end = items.length
		if (end > 0 && items[lastIndex].type === 'prompt') {
			end = lastIndex
		}

		for (let i = 0; i < end; i++) {
			const item = items[i]
			const message = this.buildHistoryItemMessage(item, priority)
			if (message) {
				messages.push(message)
			}
		}

		return messages
	}

	private buildHistoryItemMessage(item: IChatHistoryItem, priority: number): AgentMessage | null {
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
					priority: priority,
				}
			}
			case 'action': {
				const { complete: _complete, ...eventWithoutComplete } = item.action || {}
				const eventWasMessage = eventWithoutComplete._type === 'message'
				const eventWasThought = eventWithoutComplete._type === 'think'

				let textToSend: string
				if (eventWasMessage) {
					textToSend = eventWithoutComplete.text || '<message data lost>' // the text here should probably never actually be undefined, but I figure this text is a more helpful fallback for the model than an empty string
				} else if (eventWasThought) {
					textToSend = '[THOUGHT]: ' + (eventWithoutComplete.text || '<thought data lost>') // ditto above
				} else {
					textToSend = '[ACTION]: ' + JSON.stringify(eventWithoutComplete)
				}

				return {
					role: 'assistant',
					content: [{ type: 'text', text: textToSend }],
					priority: priority,
				}
			}
		}
	}
}
