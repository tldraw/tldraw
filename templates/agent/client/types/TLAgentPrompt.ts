import { BoxModel, Editor, TLBinding, TLShape, TLShapeId } from 'tldraw'
import { TLAgentModelName } from '../../worker/models'
import { IAgentEvent } from '../../worker/prompt/AgentEvent'
import { ISimpleShape } from '../../worker/simple/SimpleShape'
import { AgentHistoryItem } from '../components/chat-history/AgentHistoryItem'
import { AgentEventUtil } from '../events/AgentEventUtil'
import { SimpleContextItem } from '../promptParts/ContextItemsPromptPart'
import { PromptPartHandlerConstructor } from '../promptParts/PromptPartHandler'
import { ContextItem } from './ContextItem'
import { ScheduledRequest } from './ScheduledRequest'

// TLAgentPromptOptions contains the information needed to construct a prompt, such as all the events and prompt parts, and raw data from the editor / chat state.
export interface TLAgentPromptOptions {
	editor: Editor
	eventUtils: Map<IAgentEvent['_type'], AgentEventUtil>
	promptParts: PromptPartHandlerConstructor[]

	message: string
	contextBounds: BoxModel
	promptBounds: BoxModel

	modelName: TLAgentModelName
	historyItems: AgentHistoryItem[]
	contextItems: ContextItem[]
	currentPageContent: TLAgentContent
	currentUserViewportBounds: BoxModel
	userSelectedShapeIds: TLShapeId[]
	type: ScheduledRequest['type']
}

// TLAgentPrompt contains information that has been translated from drawl to modelish
export interface TLAgentPrompt {
	message: string
	modelName: TLAgentModelName

	contextBounds: BoxModel
	promptBounds: BoxModel

	historyItems: AgentHistoryItem[]
	contextItems: SimpleContextItem[]
	peripheralContent: BoxModel[]
	currentUserViewportBounds: BoxModel
	userSelectedShapes: ISimpleShape[]
	type: ScheduledRequest['type']

	agentViewportShapes: ISimpleShape[]
	agentViewportScreenshot: string
}

export interface TLAgentContent {
	shapes: TLShape[]
	bindings: TLBinding[]
}
