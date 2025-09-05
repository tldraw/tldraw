import { AgentActionUtil } from './actions/AgentActionUtil'
import { AlignActionUtil } from './actions/AlignActionUtil'
import { BringToFrontActionUtil } from './actions/BringToFrontActionUtil'
import { CreateActionUtil } from './actions/CreateActionUtil'
import { DebugActionUtil } from './actions/DebugActionUtil'
import { DeleteActionUtil } from './actions/DeleteActionUtil'
import { DistributeActionUtil } from './actions/DistributeActionUtil'
import { GetRandomWikiArticleActionUtil } from './actions/GetRandomWikiArticleActionUtil'
import { LabelActionUtil } from './actions/LabelActionUtil'
import { MessageActionUtil } from './actions/MessageActionUtil'
import { MoveActionUtil } from './actions/MoveActionUtil'
import { PenActionUtil } from './actions/PenActionUtil'
import { PlaceActionUtil } from './actions/PlaceActionUtil'
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
import { ApiDataPartUtil } from './parts/ApiDataPartUtil'
import { BlurryShapesPartUtil } from './parts/BlurryShapesPart'
import { ChatHistoryPartUtil } from './parts/ChatHistoryPartUtil'
import { ContextItemsPartUtil } from './parts/ContextItemsPartUtil'
import { MessagePartUtil } from './parts/MessagePartUtil'
import { ModelNamePartUtil } from './parts/ModelNamePartUtil'
import { PeripheralShapesPartUtil } from './parts/PeripheralShapesPartUtil'
import { PromptPartUtil } from './parts/PromptPartUtil'
import { ScreenshotPartUtil } from './parts/ScreenshotPartUtil'
import { SelectedShapesPartUtil } from './parts/SelectedShapesPartUtil'
import { SystemPromptPartUtil } from './parts/SystemPromptPartUtil'
import { TimePartUtil } from './parts/TimePartUtil'
import { TodoListPartUtil } from './parts/TodoListPartUtil'
import { UserActionHistoryPartUtil } from './parts/UserActionHistoryPartUtil'
import { ViewportBoundsPartUtil } from './parts/ViewportBoundsPartUtil'
import { AgentAction } from './types/AgentAction'
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
	MessagePartUtil,
	ApiDataPartUtil, // This is needed in order to receive any data from actions that request async data using `agent.scheduleAsync()`
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

	// Example from this repo's README
	TimePartUtil,

	// Misc
	// RandomWikiArticlePartUtil,
]

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

	// Drawing
	PenActionUtil,

	// Misc
	GetRandomWikiArticleActionUtil,

	// Internal (required)
	DebugActionUtil,
	UnknownActionUtil,
]

/**
 * Get an object containing all prompt part utils.
 */
export function getPromptPartUtilsRecord() {
	const object = {} as Record<PromptPart['type'], PromptPartUtil<PromptPart>>
	for (const util of PROMPT_PART_UTILS) {
		// If this line errors, it means one of your prompt parts is invalid
		object[util.type] = new util()
	}
	return object
}

/**
 * Get an object containing all agent action utils.
 */
export function getAgentActionUtilsRecord() {
	const object = {} as Record<AgentAction['_type'], AgentActionUtil<AgentAction>>
	for (const util of AGENT_ACTION_UTILS) {
		// If this line errors, it means one of your agent actions is invalid
		object[util.type] = new util()
	}
	return object
}
