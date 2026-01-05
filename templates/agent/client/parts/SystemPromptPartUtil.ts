import { SystemPromptPart } from '../../shared/schema/PromptPartDefinitions'
import { PromptPartUtil } from './PromptPartUtil'

/**
 * System prompt part util.
 *
 * Note: The actual system prompt content is defined in shared/schema/PromptPartDefinitions.ts
 * as SystemPromptPartDefinition. The worker uses the shared definition's buildSystemPrompt()
 * method to generate the system prompt. This client util only needs to provide getPart().
 */
export class SystemPromptPartUtil extends PromptPartUtil<SystemPromptPart> {
	static override type = 'systemPrompt' as const

	override getPart(): SystemPromptPart {
		return { type: 'systemPrompt' }
	}
}
