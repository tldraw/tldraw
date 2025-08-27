import { Editor } from 'tldraw'
import { AgentActionUtil } from '../actions/AgentActionUtil'
import { PromptPartUtil, PromptPartUtilConstructor } from '../parts/PromptPartUtil'
import { AgentAction } from './AgentAction'
import { AgentRequest } from './AgentRequest'

/**
 * AgentPromptOptions contains the information needed to construct all the parts of the prompt.
 */
export interface AgentPromptOptions {
	editor: Editor
	agentActionUtils: Map<AgentAction['_type'], AgentActionUtil<AgentAction>>
	promptPartUtils: Map<PromptPartUtilConstructor['type'], PromptPartUtil>
	request: AgentRequest
}

/**
 * An AgentPrompt contains all the parts created from prompt options.
 */
export type AgentPrompt = Record<PromptPartUtilConstructor['type'], any>
