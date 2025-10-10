import { TldrawAgent } from '../client/agent/TldrawAgent'
import { AddDetailActionUtil } from './actions/AddDetailActionUtil'
import { AgentActionUtil, AgentActionUtilConstructor } from './actions/AgentActionUtil'
import { AlignActionUtil } from './actions/AlignActionUtil'
import { BringToFrontActionUtil } from './actions/BringToFrontActionUtil'
import { ClearActionUtil } from './actions/ClearActionUtil'
import { CountryInfoActionUtil } from './actions/CountryInfoActionUtil'
import { CountShapesActionUtil } from './actions/CountShapesActionUtil'
import { CreateActionUtil } from './actions/CreateActionUtil'
import { DeleteActionUtil } from './actions/DeleteActionUtil'
import { DistributeActionUtil } from './actions/DistributeActionUtil'
import { LabelActionUtil } from './actions/LabelActionUtil'
import { MessageActionUtil } from './actions/MessageActionUtil'
import { MoveActionUtil } from './actions/MoveActionUtil'
import { PenActionUtil } from './actions/PenActionUtil'
import { PlaceActionUtil } from './actions/PlaceActionUtil'
import { RandomWikipediaArticleActionUtil } from './actions/RandomWikipediaArticleActionUtil'
import { ResizeActionUtil } from './actions/ResizeActionUtil'
import { ReviewActionUtil } from './actions/ReviewActionUtil'
import { RotateActionUtil } from './actions/RotateActionUtil'
import { SendToBackActionUtil } from './actions/SendToBackActionUtil'
import { SetMyViewActionUtil } from './actions/SetMyViewActionUtil'
import { StackActionUtil } from './actions/StackActionUtil'
import { ThinkActionUtil } from './actions/ThinkActionUtil'
import { TodoListActionUtil } from './actions/TodoListActionUtil'
import { UnknownActionUtil } from './actions/UnknownActionUtil'
import { UpdateActionUtil } from './actions/UpdateActionUtil'
import { BlurryShapesPartUtil } from './parts/BlurryShapesPartUtil'
import { ChatHistoryPartUtil } from './parts/ChatHistoryPartUtil'
import { ContextItemsPartUtil } from './parts/ContextItemsPartUtil'
import { DataPartUtil } from './parts/DataPartUtil'
import { MessagesPartUtil } from './parts/MessagesPartUtil'
import { ModelNamePartUtil } from './parts/ModelNamePartUtil'
import { PeripheralShapesPartUtil } from './parts/PeripheralShapesPartUtil'
import { PromptPartUtil, PromptPartUtilConstructor } from './parts/PromptPartUtil'
import { ScreenshotPartUtil } from './parts/ScreenshotPartUtil'
import { SelectedShapesPartUtil } from './parts/SelectedShapesPartUtil'
import { SystemPromptPartUtil } from './parts/SystemPromptPartUtil'
import { TimePartUtil } from './parts/TimePartUtil'
import { TodoListPartUtil } from './parts/TodoListPartUtil'
import { UserActionHistoryPartUtil } from './parts/UserActionHistoryPartUtil'
import { ViewportBoundsPartUtil } from './parts/ViewportBoundsPartUtil'
import { AgentAction } from './types/AgentAction'
import { BaseAgentAction } from './types/BaseAgentAction'
import { BasePromptPart } from './types/BasePromptPart'
import { PromptPart } from './types/PromptPart'

/**
 * Prompt parts determine what information will be sent to the model.
 *
 * To stop sending something to the model, remove it from the list.
 * To send something new to the model, either change one of the existing parts, or add your own.
 */
export const PROMPT_PART_UTILS = [
	// Model
	SystemPromptPartUtil,
	ModelNamePartUtil,

	// Request
	MessagesPartUtil,
	DataPartUtil,
	ContextItemsPartUtil,

	// Viewport
	ScreenshotPartUtil,
	ViewportBoundsPartUtil,

	// Shapes
	BlurryShapesPartUtil,
	PeripheralShapesPartUtil,
	SelectedShapesPartUtil,

	// History
	ChatHistoryPartUtil,
	UserActionHistoryPartUtil,
	TodoListPartUtil,

	// Metadata
	TimePartUtil,
] satisfies PromptPartUtilConstructor<BasePromptPart>[]

/**
 * Agent actions determine what actions the agent can take.
 *
 * To prevent the agent from doing an action, remove it from the list.
 * To let the agent do more, either change one of the existing actions, or add your own.
 */
export const AGENT_ACTION_UTILS = [
	// Communication
	MessageActionUtil,

	// Planning
	ThinkActionUtil,
	ReviewActionUtil,
	AddDetailActionUtil,
	TodoListActionUtil,
	SetMyViewActionUtil,

	// Individual shapes
	CreateActionUtil,
	DeleteActionUtil,
	UpdateActionUtil,
	LabelActionUtil,
	MoveActionUtil,

	// Groups of shapes
	PlaceActionUtil,
	BringToFrontActionUtil,
	SendToBackActionUtil,
	RotateActionUtil,
	ResizeActionUtil,
	AlignActionUtil,
	DistributeActionUtil,
	StackActionUtil,
	ClearActionUtil,

	// Drawing
	PenActionUtil,

	// External APIs
	RandomWikipediaArticleActionUtil,
	CountryInfoActionUtil,
	CountShapesActionUtil,

	// Internal (required)
	UnknownActionUtil,
] satisfies AgentActionUtilConstructor<BaseAgentAction>[]

/**
 * Get an object containing all prompt part utils.
 */
export function getPromptPartUtilsRecord(agent?: TldrawAgent) {
	const object = {} as Record<PromptPart['type'], PromptPartUtil<PromptPart>>
	for (const util of PROMPT_PART_UTILS) {
		object[util.type] = new util(agent)
	}
	return object
}

/**
 * Get an object containing all agent action utils.
 */
export function getAgentActionUtilsRecord(agent?: TldrawAgent) {
	const object = {} as Record<AgentAction['_type'], AgentActionUtil<AgentAction>>
	for (const util of AGENT_ACTION_UTILS) {
		object[util.type] = new util(agent)
	}
	return object
}
