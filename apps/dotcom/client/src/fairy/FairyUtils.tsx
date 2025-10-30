import { AgentAction, PromptPart } from '@tldraw/fairy-shared'
import { AgentActionUtil, AgentActionUtilConstructor } from './actions/AgentActionUtil'
import { AlignActionUtil } from './actions/AlignActionUtil'
import { AssignTodoItemActionUtil } from './actions/AssignTodoItemActionUtil'
import { BringToFrontActionUtil } from './actions/BringToFrontActionUtil'
import { CreateActionUtil } from './actions/CreateActionUtil'
import { DeleteActionUtil } from './actions/DeleteActionUtil'
import { DistributeActionUtil } from './actions/DistributeActionUtil'
import { FlyToBoundsActionUtil } from './actions/FlyToBoundsActionUtil'
import { LabelActionUtil } from './actions/LabelActionUtil'
import { MessageActionUtil } from './actions/MessageActionUtil'
import { MoveActionUtil } from './actions/MoveActionUtil'
import { PenActionUtil } from './actions/PenActionUtil'
import { PlaceActionUtil } from './actions/PlaceActionUtil'
import { ResizeActionUtil } from './actions/ResizeActionUtil'
import { ReviewActionUtil } from './actions/ReviewActionUtil'
import { RotateActionUtil } from './actions/RotateActionUtil'
import { SendToBackActionUtil } from './actions/SendToBackActionUtil'
import { SharedTodoListActionUtil } from './actions/SharedTodoListActionUtil'
import { StackActionUtil } from './actions/StackActionUtil'
import { ThinkActionUtil } from './actions/ThinkActionUtil'
import { UnknownActionUtil } from './actions/UnknownActionUtil'
import { UpdateActionUtil } from './actions/UpdateActionUtil'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { BlurryShapesPartUtil } from './parts/BlurryShapesPartUtil'
import { ChatHistoryPartUtil } from './parts/ChatHistoryPartUtil'
import { ContextItemsPartUtil } from './parts/ContextItemsPartUtil'
import { DataPartUtil } from './parts/DataPartUtil'
import { MessagesPartUtil } from './parts/MessagesPartUtil'
import { OtherFairiesPartUtil } from './parts/OtherFairiesPartUtil'
import { PeripheralShapesPartUtil } from './parts/PeripheralShapesPartUtil'
import { PersonalityPartUtil } from './parts/PersonalityPartUtil'
import { PromptPartUtil, PromptPartUtilConstructor } from './parts/PromptPartUtil'
import { ScreenshotPartUtil } from './parts/ScreenshotPartUtil'
import { SelectedShapesPartUtil } from './parts/SelectedShapesPartUtil'
import { SharedTodoListPartUtil } from './parts/SharedTodoListPartUtil'
import { TimePartUtil } from './parts/TimePartUtil'
import { UserActionHistoryPartUtil } from './parts/UserActionHistoryPartUtil'
import { ViewportBoundsPartUtil } from './parts/ViewportBoundsPartUtil'
import { WandPartUtil } from './parts/WandPartUtil'

/**
 * Agent action utils determine what actions do.
 */
export const AGENT_ACTION_UTILS = [
	// Communication
	MessageActionUtil,

	// Planning
	ThinkActionUtil,
	ReviewActionUtil,
	SharedTodoListActionUtil,
	FlyToBoundsActionUtil,

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

	// Internal (required)
	UnknownActionUtil,

	// Assign todo item
	AssignTodoItemActionUtil,
] satisfies AgentActionUtilConstructor<AgentAction>[]

/**
 * Prompt parts determine what information will be sent to the model.
 *
 * To stop sending something to the model, remove it from the list.
 * To send something new to the model, either change one of the existing parts, or add your own.
 */
export const PROMPT_PART_UTILS = [
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
	SharedTodoListPartUtil,

	// Metadata
	TimePartUtil,

	// Fairy-specific
	OtherFairiesPartUtil,
	WandPartUtil,
	PersonalityPartUtil,
] satisfies PromptPartUtilConstructor<PromptPart>[]

/**
 * Get an object containing all agent action utils.
 */
export function getAgentActionUtilsRecord(agent: FairyAgent) {
	const object = {} as Record<AgentAction['_type'], AgentActionUtil<AgentAction>>
	for (const util of AGENT_ACTION_UTILS) {
		object[util.type] = new util(agent)
	}
	return object
}

/**
 * Get an object containing all prompt part utils.
 */
export function getPromptPartUtilsRecord(agent: FairyAgent) {
	const object = {} as Record<PromptPart['type'], PromptPartUtil<PromptPart>>
	for (const util of PROMPT_PART_UTILS) {
		object[util.type] = new util(agent)
	}
	return object
}
