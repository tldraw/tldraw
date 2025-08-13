import { AgentTransform } from '../AgentTransform'
import { AgentPrompt, AgentPromptOptions } from '../types/AgentPrompt'

/**
 * Get a full prompt based on the provided prompt options.
 *
 * @returns The fully assembled prompt. (in worker-ish)
 */
export async function preparePrompt(
	promptOptions: AgentPromptOptions,
	transform: AgentTransform
): Promise<AgentPrompt> {
	const { modelName, request, promptPartUtils } = promptOptions

	const prompt: Partial<AgentPrompt> = {
		type: request.type,
		modelName,
		parts: {} as AgentPrompt['parts'],
	}

	for (const [_type, promptPartUtil] of promptPartUtils) {
		const part = await promptPartUtil.getPart(promptOptions)

		// Console logs specifically for UserSelectedShapesPartUtil
		if (_type === 'userSelectedShapes') {
			console.log('UserSelectedShapesPartUtil - Raw part from getPart():', part)
			console.log('UserSelectedShapesPartUtil - Part length:', part?.length || 0)
			console.log(
				'UserSelectedShapesPartUtil - Has transformPromptPart method:',
				typeof promptPartUtil.transformPromptPart === 'function'
			)
		}

		// If the util has a transformPromptPart method, use it; otherwise, assign the promptPart
		const maybeTransformedPart =
			typeof promptPartUtil.transformPromptPart === 'function'
				? promptPartUtil.transformPromptPart(part, transform, prompt)
				: part

		// More console logs for UserSelectedShapesPartUtil
		if (_type === 'userSelectedShapes') {
			console.log('UserSelectedShapesPartUtil - Transformed part:', maybeTransformedPart)
			console.log(
				'UserSelectedShapesPartUtil - Transformed part length:',
				maybeTransformedPart?.length || 0
			)
			console.log('UserSelectedShapesPartUtil - Will be added to prompt:', !!maybeTransformedPart)
		}

		if (maybeTransformedPart) {
			;(prompt.parts as any)[_type] = maybeTransformedPart
		}
	}

	console.log('PROMPT', prompt)
	return prompt as AgentPrompt
}
