import { $chatHistoryItems } from '../atoms/chatHistoryItems'
import { AgentHistoryItem } from '../components/chat-history/AgentHistoryItem'
import { AgentPrompt, AgentPromptOptions } from '../types/AgentPrompt'
import { processContextItem } from './ContextItemsPartUtil'
import { AgentMessage, AgentMessageContent, PromptPartUtil } from './PromptPartUitl'

export class HistoryItemPartUtil extends PromptPartUtil {
	static override type = 'historyItems' as const

	static override getPriority(_prompt: AgentPrompt): number {
		return Infinity // history should appear early in the prompt (low priority)
	}

	override async getPart(options: Partial<AgentPromptOptions>) {
		const historyItems = $chatHistoryItems.get()
		const processedHistoryItems = historyItems.map((item) => {
			if (item.type === 'prompt') {
				return {
					...item,
					contextItems: item.contextItems.map((contextItem) =>
						processContextItem(contextItem, options.editor)
					),
				}
			}
			return item
		})

		return processedHistoryItems
	}

	static override buildContent(_prompt: AgentPrompt, _historyItems: any[]): string[] {
		// Default implementation - not used since we override buildMessages
		return []
	}

	// Override buildMessages to return individual TLMessages for each history item
	static override buildMessages(
		prompt: AgentPrompt,
		historyItems: AgentHistoryItem[]
	): AgentMessage[] {
		const messages: AgentMessage[] = []
		const priority = this.getPriority(prompt)

		// If the last message is from the user, skip it
		const lastIndex = historyItems.length - 1
		let end = historyItems.length
		if (end > 0 && historyItems[lastIndex].type === 'prompt') {
			end = lastIndex
		}

		for (let i = 0; i < end; i++) {
			const item = historyItems[i]
			const message = this.buildHistoryItemMessage(item, priority)
			if (message) {
				messages.push(message)
			}
		}

		return messages
	}

	private static buildHistoryItemMessage(
		item: AgentHistoryItem,
		priority: number
	): AgentMessage | null {
		switch (item.type) {
			case 'prompt': {
				const content: AgentMessageContent[] = [{ type: 'text', text: item.message }]
				if (item.contextItems.length > 0) {
					for (const contextItem of item.contextItems) {
						switch (contextItem.type) {
							case 'shape': {
								const simpleShape = contextItem.shape
								content.push({
									type: 'text',
									text: `[CONTEXT]: ${JSON.stringify(simpleShape, null, 2)}`,
								})
								break
							}
							case 'shapes': {
								const simpleShapes = contextItem.shapes
								content.push({
									type: 'text',
									text: `[CONTEXT]: ${JSON.stringify(simpleShapes, null, 2)}`,
								})
								break
							}
							default: {
								content.push({
									type: 'text',
									text: `[CONTEXT]: ${JSON.stringify(contextItem, null, 2)}`,
								})
								break
							}
						}
					}
				}
				return {
					role: 'user',
					content,
					priority: priority,
				}
			}
			case 'event': {
				return {
					role: 'assistant',
					content: [{ type: 'text', text: '[AGENT ACTED]: ' + JSON.stringify(item.event) }],
					priority: priority,
				}
			}
			case 'change': {
				return {
					role: 'assistant',
					content: [
						{
							type: 'text',
							text: '[AGENT CHANGED THE CANVAS]: ' + JSON.stringify(item.event),
						},
					],
					priority: priority,
				}
			}
			case 'group': {
				return {
					role: 'assistant',
					content: [
						{
							type: 'text',
							text: '[AGENT CHANGED THE CANVAS]: ' + JSON.stringify(item.items),
						},
					],
					priority: priority,
				}
			}
		}
	}
}
