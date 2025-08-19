import { $agentHistoryItems } from '../../client/atoms/agentHistoryItems'
import { AgentHistoryItem } from '../types/AgentHistoryItem'
import { AgentMessage, AgentMessageContent } from '../types/AgentMessage'
import { AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUtil'

export class HistoryItemPartUtil extends PromptPartUtil<AgentHistoryItem[]> {
	static override type = 'historyItems' as const

	override getPriority() {
		return Infinity // history should appear early in the prompt (low priority)
	}

	override async getPart(_options: AgentPromptOptions) {
		return $agentHistoryItems.get()
	}

	override buildMessages(historyItems: AgentHistoryItem[]): AgentMessage[] {
		const messages: AgentMessage[] = []
		const priority = this.getPriority()

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

	private buildHistoryItemMessage(item: AgentHistoryItem, priority: number): AgentMessage | null {
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
			case 'event': {
				const { complete: _complete, ...eventWithoutComplete } = item.event || {}
				return {
					role: 'assistant',
					content: [
						{ type: 'text', text: '[AGENT ACTED]: ' + JSON.stringify(eventWithoutComplete) },
					],
					priority: priority,
				}
			}
		}
	}
}
