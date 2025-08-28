import { Editor } from 'tldraw'
import { PROMPT_PART_UTILS as _PROMPT_PART_UTILS } from '../AgentUtils'
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
 * An object with all parts of the prompt, defined by: {@link _PROMPT_PART_UTILS}.
 */
export type AgentPrompt = BaseAgentPrompt<PromptPart>
