import { AgentModelName } from '../../worker/models'
import { AgentTransform } from '../AgentTransform'
import { AgentMessage, AgentMessageContent } from '../types/AgentMessage'
import { AgentPrompt, AgentPromptOptions } from '../types/AgentPrompt'

export abstract class PromptPartUtil<T = any> {
	static type: string

	constructor() {}

	/**
	 * Get some data to add to the prompt.
	 * This is what gets added to chat history.
	 * @returns The prompt part, or undefined to add nothing to the prompt.
	 */
	async getPart?(_options: AgentPromptOptions): Promise<T>

	/**
	 * Transform the prompt part before it's added to the final prompt.
	 * @returns The transformed prompt part, or null to reject the part
	 */
	transformPart(
		promptPart: T,
		_transform: AgentTransform,
		_prompt: Partial<AgentPrompt>
	): T | null {
		return promptPart
	}

	/**
	 * Get priority for this prompt part to determine its position in the prompt.
	 * Lower numbers have higher priority.
	 *
	 * This function gets used by the default `buildMessages` function.
	 * @returns The priority.
	 */
	getPriority(_part: T, _prompt: AgentPrompt): number {
		return 0
	}

	/**
	 * Get the name of the model to use for this generation.
	 * @returns The model name, or null to not use a model name.
	 */
	getModelName(_part: T, _prompt: AgentPrompt): AgentModelName | null {
		// TODO: This should be extended to return some kind of priority or method for selecting which model to use if there are multiple prompt parts overriding this. Right now, in getModelName.ts, we just return the first model name that is not null.
		return null
	}

	/**
	 * Build an array of text or image content for this prompt part.
	 *
	 * This function gets used by the default `buildMessages` function.
	 * @returns An array of text or image content.
	 */
	buildContent(_part: T, _prompt: AgentPrompt): string[] {
		return []
	}

	/**
	 * Build an array of messages to send to the model.
	 * Note: Overriding this function can bypass the `buildContent` and `getPriority` functions.
	 *
	 * @returns An array of messages.
	 */
	buildMessages(part: T, prompt: AgentPrompt): AgentMessage[] {
		const content = this.buildContent(part, prompt)
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

		return [{ role: 'user', content: messageContent, priority: this.getPriority(part, prompt) }]
	}

	/**
	 * Build a system message that gets concatenated with the other system messages.
	 * @returns The system message, or null to not add anything to the system message.
	 */
	buildSystemMessage(_part: T, _prompt: AgentPrompt): string | null {
		return null
	}
}

export interface PromptPartUtilConstructor<T = any> {
	new (): PromptPartUtil<T>
	type: string
}
