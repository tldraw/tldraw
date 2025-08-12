import { Editor } from 'tldraw'
import { AgentTransform } from '../AgentTransform'
import { TLAgentPrompt, TLAgentPromptOptions } from '../types/TLAgentPrompt'

export abstract class PromptPartUtil {
	static type: string

	constructor(public editor: Editor) {}

	/**
	 * Generate the prompt part based on the options.
	 * This is where the actual prompt part logic goes.
	 * Can be async for operations like taking screenshots.
	 */
	async getPart(_options: TLAgentPromptOptions): Promise<Partial<TLAgentPrompt>> {
		return {}
	}

	/**
	 * Transform the prompt part before it's added to the final prompt.
	 * Useful for sanitizing or modifying prompt parts.
	 * @returns The transformed prompt part, or null to reject the part
	 */
	transformPromptPart(
		prompt: Partial<TLAgentPrompt>,
		_transform: AgentTransform
	): Partial<TLAgentPrompt> | null {
		return prompt
	}
}

export interface PromptPartUtilConstructor {
	new (editor: Editor): PromptPartUtil
	type: string
}
