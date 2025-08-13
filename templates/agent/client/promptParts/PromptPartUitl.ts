import { Editor } from 'tldraw'
import { AgentTransform } from '../AgentTransform'
import { AgentPrompt, AgentPromptOptions } from '../types/AgentPrompt'

export interface AgentMessage {
	role: 'user' | 'assistant'
	content: AgentMessageContent[]
	priority: number // higher priority (lower numbers) appear later in the prompt
}

export interface AgentMessageContent {
	type: 'text' | 'image'
	text?: string
	image?: string
}

export abstract class PromptPartUtil {
	static type: string

	constructor(public editor: Editor) {}

	/**
	 * Generate the prompt part based on the options.
	 * This is where the actual prompt part logic goes.
	 * Can be async for operations like taking screenshots.
	 */
	async getPart(_options: AgentPromptOptions): Promise<any> {
		// TODO shouldnt be any?
		return {}
	}

	/**
	 * Transform the prompt part before it's added to the final prompt.
	 * Useful for sanitizing or modifying prompt parts.
	 * @returns The transformed prompt part, or null to reject the part
	 */
	transformPromptPart(
		promptPart: any,
		_transform: AgentTransform,
		_prompt: Partial<AgentPrompt>
	): any | null {
		return promptPart
	}

	// Static methods are the only ones that can be called by the worker because we can't make instances of these without the editor, which can't be on the worker

	static getPriority(_prompt: AgentPrompt): number {
		throw new Error('getPriority must be implemented by subclasses')
	}

	// Build content for this prompt part (strings and image data)
	static buildContent(_prompt: AgentPrompt, _promptPart: any): string[] {
		return []
	}

	// Build messages for this prompt part (calls buildContent by default)
	static buildMessages(prompt: AgentPrompt, promptPart: any): AgentMessage[] {
		const content = this.buildContent(prompt, promptPart)
		if (!content || content.length === 0) {
			return []
		}

		const messageContent: AgentMessageContent[] = []
		for (const item of content) {
			if (typeof item === 'string' && item.startsWith('data:image/')) {
				messageContent.push({
					type: 'image',
					image: item,
				})
			} else {
				messageContent.push({
					type: 'text',
					text: item,
				})
			}
		}

		return [{ role: 'user', content: messageContent, priority: this.getPriority(prompt) }]
	}
}

export interface PromptPartUtilConstructor {
	new (editor: Editor): PromptPartUtil
	type: string
	getPriority(prompt: AgentPrompt): number
	buildContent(prompt: AgentPrompt, promptPart: any): string[]
	buildMessages(prompt: AgentPrompt, promptPart: any): AgentMessage[]
}
