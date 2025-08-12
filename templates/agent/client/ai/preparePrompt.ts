import { AgentTransform } from '../AgentTransform'
import { TLAgentPrompt, TLAgentPromptOptions } from '../types/TLAgentPrompt'

/**
 * Get a full prompt based on the provided prompt options.
 *
 * @returns The fully assembled prompt.
 */
export async function preparePrompt(
	promptOptions: TLAgentPromptOptions,
	transform: AgentTransform
): Promise<TLAgentPrompt> {
	const {
		editor,

		modelName,
		type,

		historyItems,

		promptParts,
	} = promptOptions

	const prompt: Partial<TLAgentPrompt> = {
		type,
		modelName,

		historyItems,
	}

	// Generate prompt parts using handlers
	for (const promptPartConstructor of promptParts) {
		const handler = new promptPartConstructor(editor, transform)
		console.log('handler', promptPartConstructor.type)
		const promptPart = await handler.getPromptPart(promptOptions)

		// If the handler has a transformPromptPart method, use it; otherwise, just assign the promptPart
		const transformedPart =
			typeof handler.transformPromptPart === 'function'
				? handler.transformPromptPart(promptPart, promptOptions)
				: promptPart

		if (transformedPart) {
			Object.assign(prompt, transformedPart)
		}
	}

	console.log(prompt)
	return prompt as TLAgentPrompt
}
