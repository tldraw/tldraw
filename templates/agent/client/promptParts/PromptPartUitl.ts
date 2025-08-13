import { Editor } from 'tldraw'
import { AgentTransform } from '../AgentTransform'
import { TLAgentPrompt, TLAgentPromptOptions } from '../types/TLAgentPrompt'

export interface TLMessage {
	role: 'user' | 'assistant'
	content: TLMessageContent[]
	priority: number // higher priority (lower numbers) appear later in the prompt
}

export interface TLMessageContent {
	type: 'text' | 'image'
	text?: string
	image?: string
}

export abstract class PromptPartUtil {
	static type: string

	constructor(public editor: Editor) {}

	// Get priority for this prompt part util - must be implemented by subclasses
	static getPriority(_prompt: TLAgentPrompt): number {
		throw new Error('getPriority must be implemented by subclasses')
	}

	/**
	 * Generate the prompt part based on the options.
	 * This is where the actual prompt part logic goes.
	 * Can be async for operations like taking screenshots.
	 */
	async getPart(_options: TLAgentPromptOptions): Promise<any> {
		// TODO shouldnt be any?
		return {}
	}

	/**
	 * Transform the prompt part before it's added to the final prompt.
	 * Useful for sanitizing or modifying prompt parts.
	 * @returns The transformed prompt part, or null to reject the part
	 */
	transformPromptPart(prompt: any, _transform: AgentTransform): any | null {
		return prompt
	}

	// Build content for this prompt part (strings and image data)
	static buildContent(_prompt: TLAgentPrompt, _promptPart: any): string[] {
		return []
	}

	// Build TLMessages for this prompt part (calls buildContent by default)
	static buildMessages(prompt: TLAgentPrompt, promptPart: any): TLMessage[] {
		const content = this.buildContent(prompt, promptPart)
		if (!content || content.length === 0) {
			return []
		}

		const messageContent: TLMessageContent[] = []
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
	getPriority(prompt: TLAgentPrompt): number
	buildContent(prompt: TLAgentPrompt, promptPart: any): string[]
	buildMessages(prompt: TLAgentPrompt, promptPart: any): TLMessage[]
}
