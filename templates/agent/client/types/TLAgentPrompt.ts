import { BoxModel, Editor, TLBinding, TLShape } from 'tldraw'
import { TLAgentModelName } from '../../worker/models'
import { IAgentEvent } from '../../worker/prompt/AgentEvent'
import { TldrawAgentTransformConstructor } from '../transforms/TldrawAgentTransform'
import { ChatHistoryItem } from './ChatHistoryItem'
import { ContextItem } from './ContextItem'
import { ScheduledRequest } from './ScheduledRequest'
import { Streaming } from './Streaming'

export interface TLAgentPromptOptions {
	editor: Editor
	transforms: TldrawAgentTransformConstructor[]
	apply: TLAgentPromptApplyFn

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

export type TLAgentPromptApplyFn = ({
	editor,
	event,
	transformEvent,
}: {
	editor: Editor
	event: Streaming<IAgentEvent>
	transformEvent(event: Streaming<IAgentEvent>): Streaming<IAgentEvent>
}) => void
