import { Editor } from 'tldraw'
import { AgentTransform } from '../AgentTransform'
import { TLAgentPrompt, TLAgentPromptOptions } from '../types/TLAgentPrompt'

export abstract class PromptPartHandler {
	static type: string

	constructor(
		public editor: Editor,
		public transform: AgentTransform
	) {}

	/**
	 * Generate the prompt part based on the options.
	 * This is where the actual prompt part logic goes.
	 * Can be async for operations like taking screenshots.
	 */
	async getPromptPart(_options: TLAgentPromptOptions): Promise<Partial<TLAgentPrompt>> {
		return {}
	}

	/**
	 * Transform the prompt part before it's added to the final prompt.
	 * Useful for sanitizing or modifying prompt parts.
	 * @returns The transformed prompt part, or null to reject the part
	 */
	transformPromptPart(
		prompt: Partial<TLAgentPrompt>,
		_options: TLAgentPromptOptions
	): Partial<TLAgentPrompt> | null {
		return prompt
	}
}

export interface PromptPartHandlerConstructor {
	new (editor: Editor, transform: AgentTransform): PromptPartHandler
	type: string
}
