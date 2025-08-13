import { Editor, TLBinding, TLShape } from 'tldraw'
import { TLAgentModelName } from '../../worker/models'
import { IAgentEvent } from '../../worker/prompt/AgentEvent'
import { AgentEventUtil } from '../events/AgentEventUtil'
import { PromptPartUtil, PromptPartUtilConstructor } from '../promptParts/PromptPartUitl'
import { ScheduledRequest } from './ScheduledRequest'

// TLAgentPromptOptions contains the information needed to construct a prompt, such as all the events and prompt parts, and raw data from the editor / chat state.
export interface TLAgentPromptOptions {
	editor: Editor
	eventUtils: Map<IAgentEvent['_type'], AgentEventUtil>
	promptPartUtils: Map<PromptPartUtilConstructor['type'], PromptPartUtil>

	modelName: TLAgentModelName

	request: ScheduledRequest
	// requestType: ScheduledRequest['type']

	// historyItems: AgentHistoryItem[]
	// contextBounds: BoxModel
	// promptBounds: BoxModel
	// contextItems: ContextItem[]

	// message: string

	// currentPageContent: TLAgentContent
	// currentUserViewportBounds: BoxModel
	// userSelectedShapeIds: TLShapeId[]
}

// TLAgentPrompt contains information that has been translated from drawl to modelish
export interface TLAgentPrompt {
	modelName: TLAgentModelName
	type: ScheduledRequest['type']

	parts: Record<PromptPartUtilConstructor['type'], any>

	// rest are prompt parts
	// message: string

	// contextBounds: BoxModel
	// promptBounds: BoxModel

	// historyItems: AgentHistoryItem[]
	// contextItems: SimpleContextItem[]
	// peripheralContent: BoxModel[]
	// currentUserViewportBounds: BoxModel
	// userSelectedShapes: ISimpleShape[]

	// agentViewportShapes: ISimpleShape[]
	// agentViewportScreenshot: string
}

export interface TLAgentContent {
	shapes: TLShape[]
	bindings: TLBinding[]
}
