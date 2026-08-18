import { Editor } from 'tldraw'
import { AgentRequest } from './AgentRequest'
import { BasePromptPart } from './BasePromptPart'
import { PromptPart } from './PromptPart'

export interface AgentPromptOptions {
	editor: Editor
	request: AgentRequest
}

export type BaseAgentPrompt<T extends BasePromptPart = BasePromptPart> = {
	[P in T as P['type']]: P
}

/** All parts of the prompt, keyed by type; see shared/schema/PromptPartDefinitions.ts. */
export type AgentPrompt = BaseAgentPrompt<PromptPart>
