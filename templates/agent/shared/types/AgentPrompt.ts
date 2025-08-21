import { Editor, TLBinding, TLShape } from 'tldraw'
import { AgentModelName } from '../../worker/models'
import { AgentActionUtil } from '../actions/AgentActionUtil'
import { PromptPartUtil, PromptPartUtilConstructor } from '../parts/PromptPartUtil'
import { AgentAction } from './AgentAction'
import { ScheduledRequest } from './ScheduledRequest'

// AgentPromptOptions contains the information needed to construct a prompt, such as all the events and prompt parts, and raw data from the editor / chat state.
export interface AgentPromptOptions {
	editor: Editor
	eventUtils: Map<AgentAction['_type'], AgentActionUtil<AgentAction>>
	promptPartUtils: Map<PromptPartUtilConstructor['type'], PromptPartUtil>

	modelName: AgentModelName
	request: ScheduledRequest
}

// TLAgentPrompt contains information that has been translated from drawl to modelish
export interface AgentPrompt {
	modelName: AgentModelName
	type: ScheduledRequest['type']

	parts: Record<PromptPartUtilConstructor['type'], any>
}

export interface AgentContent {
	shapes: TLShape[]
	bindings: TLBinding[]
}
