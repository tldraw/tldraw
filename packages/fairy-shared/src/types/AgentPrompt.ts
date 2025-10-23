import { Editor } from '@tldraw/editor'
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
export type BaseAgentPrompt<T extends BasePromptPart = BasePromptPart> = Partial<{
	[P in T as P['type']]: P
}>

/**
 * An object with all parts of the prompt.
 */
export type AgentPrompt = BaseAgentPrompt<PromptPart>
