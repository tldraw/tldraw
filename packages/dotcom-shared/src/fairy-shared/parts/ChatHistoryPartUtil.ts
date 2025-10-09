import { structuredClone } from 'tldraw'
import { AgentHelpers } from '../AgentHelpers'
import { AgentMessage, AgentMessageContent } from '../types/AgentMessage'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { ChatHistoryItem } from '../types/ChatHistoryItem'
import { PromptPartUtil } from './PromptPartUtil'

export interface ChatHistoryPart extends BasePromptPart<'chatHistory'> {
	items: ChatHistoryItem[] | null
}

export class ChatHistoryPartUtil extends PromptPartUtil<ChatHistoryPart> {
	static override type = 'chatHistory' as const

	override getPriority() {
		return Infinity // history should appear first in the prompt (low priority)
	}

	override async getPart(_request: AgentRequest, helpers: AgentHelpers) {
		if (!this.agent) return { type: 'chatHistory' as const, items: null }

		const items = structuredClone(this.agent.$chatHistory.get())

		for (const historyItem of items) {
			if (historyItem.type !== 'prompt') continue

			// Offset and round the context items of each history item
			const contextItems = historyItem.contextItems.map((contextItem) => {
				const offsetContextItem = helpers.applyOffsetToContextItem(contextItem)
				return helpers.roundContextItem(offsetContextItem)
			})

			historyItem.contextItems = contextItems
		}

		return {
			type: 'chatHistory' as const,
			items,
		}
	}

	override buildMessages({ items }: ChatHistoryPart): AgentMessage[] {
		if (!items) return []

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
			if (message) messages.push(message)
		}

		return messages
	}

	private buildHistoryItemMessage(item: ChatHistoryItem, priority: number): AgentMessage | null {
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
}
