import { BoxModel, Editor, TLBinding, TLShape } from 'tldraw'
import { TLAgentModelName } from '../../worker/models'
import { IAgentEvent } from '../../worker/prompt/AgentEvent'
import { AgentHistoryItem } from '../components/chat-history/AgentHistoryItem'
import { AgentEventUtil } from '../events/AgentEventUtil'
import { ContextItem } from './ContextItem'
import { ScheduledRequest } from './ScheduledRequest'

export interface TLAgentPromptOptions {
	editor: Editor
	eventUtils: Map<IAgentEvent['_type'], AgentEventUtil>

	message: string
	contextBounds: BoxModel
	promptBounds: BoxModel

	modelName: TLAgentModelName
	historyItems: AgentHistoryItem[]
	contextItems: ContextItem[]
	currentPageShapes: TLShape[]
	currentUserViewportBounds: BoxModel
	userSelectedShapes: TLShape[]
	type: ScheduledRequest['type']
}

export interface TLAgentPrompt {
	message: string
	contextBounds: BoxModel
	promptBounds: BoxModel

	modelName: TLAgentModelName
	historyItems: AgentHistoryItem[]
	contextItems: ContextItem[]
	currentPageShapes: TLShape[]
	currentUserViewportBounds: BoxModel
	userSelectedShapes: TLShape[]
	type: ScheduledRequest['type']

	canvasContent: TLAgentContent
	image: string | undefined
}

export interface TLAgentContent {
	shapes: TLShape[]
	bindings: TLBinding[]
}
