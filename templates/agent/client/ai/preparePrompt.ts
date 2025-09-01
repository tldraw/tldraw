import { Editor } from 'tldraw'
import { AgentTransform } from '../../shared/AgentTransform'
import { PromptPartUtil } from '../../shared/parts/PromptPartUtil'
import { AgentPrompt } from '../../shared/types/AgentPrompt'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { PromptPart } from '../../shared/types/PromptPart'

/**
 * Get a full prompt based on the provided prompt options.
 *
 * @returns The fully assembled prompt. (in worker-ish)
 */
export async function preparePrompt({
	editor,
	request,
	transform,
	promptPartUtils,
}: {
	editor: Editor
	request: AgentRequest
	transform: AgentTransform
	promptPartUtils: Record<PromptPart['type'], PromptPartUtil<PromptPart>>
}): Promise<AgentPrompt> {
	const transformedParts: PromptPart[] = []

	for (const util of Object.values(promptPartUtils)) {
		const untransformedPart = await util.getPart(editor, request)
		const transformedPart = util.transformPart(untransformedPart, transform)
		if (!transformedPart) continue
		transformedParts.push(transformedPart)
	}

	const agentPrompt = Object.fromEntries(transformedParts.map((part) => [part.type, part]))

	console.log('PROMPT', agentPrompt)
	return agentPrompt as AgentPrompt
}
