import { BoxModel, Editor, TLBinding, TLShape, TLShapeId } from 'tldraw'
import { TLAgentModelName } from '../../worker/models'
import { IAgentEvent } from '../../worker/prompt/AgentEvent'
import { ISimpleShape } from '../../worker/simple/SimpleShape'
import { AgentIconType } from '../components/chat-history/AgentIcon'
import { AgentHistoryItem } from '../components/chat-history/AgentHistoryItem'
import { AgentEventUtil } from '../events/AgentEventUtil'
import { PromptPartHandlerConstructor } from '../promptParts/PromptPartHandler'
import {
	AreaContextItem,
	ContextItem,
	PointContextItem,
	ShapeContextItem,
	ShapesContextItem,
} from './ContextItem'
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

//simple context items (these will move at some point)
export type SimpleContextItem =
	| SimpleShapeContextItem
	| SimpleShapesContextItem
	| SimpleAreaContextItem
	| SimplePointContextItem

export type SimpleShapeContextItem = Omit<ShapeContextItem, 'shape'> & {
	shape: ISimpleShape
}

export type SimpleShapesContextItem = Omit<ShapesContextItem, 'shapes'> & {
	shapes: ISimpleShape[]
}

export type SimpleAreaContextItem = AreaContextItem
export type SimplePointContextItem = PointContextItem

export interface SimpleContextItemDefinition {
	name(item: SimpleContextItem): string
	icon: AgentIconType
}
