import { Editor } from 'tldraw'
import { AgentRequest } from './AgentRequest'
import { BasePromptPart } from './BasePromptPart'
import { PromptPart } from './PromptPart'

/**
 * AgentPromptOptions contains the information needed to construct all the parts of the prompt.
 */
export interface AgentPromptOptions {
	editor: Editor
	request: AgentRequest
}

/**
 * An AgentPrompt contains all the parts created from prompt options.
 */
export type BaseAgentPrompt<T extends BasePromptPart = BasePromptPart> = {
	[P in T as P['type']]: P
}

/**
 * An object with all parts of the prompt, defined by PROMPT_PART_DEFINITIONS in shared/schema.
 */
export type AgentPrompt = BaseAgentPrompt<PromptPart>
