import { BoxModel, Editor, TLBinding, TLShape } from 'tldraw'
import { TLAgentModelName } from '../../worker/models'
import { AgentEventHandler } from '../../worker/prompt/AgentEvent'
import { TldrawAgentTransform } from '../transforms/TldrawAgentTransform'
import { ChatHistoryItem } from './ChatHistoryItem'
import { ContextItem } from './ContextItem'
import { ScheduledRequest } from './ScheduledRequest'

export interface TLAgentPromptOptions {
	editor: Editor
	transforms: TldrawAgentTransform[]
	handleEvent: AgentEventHandler

	message: string
	contextBounds: BoxModel
	promptBounds: BoxModel

	modelName: TLAgentModelName
	historyItems: ChatHistoryItem[]
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
	historyItems: ChatHistoryItem[]
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
