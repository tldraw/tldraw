import { AgentAction, PromptPart } from '@tldraw/fairy-shared'
import { AgentActionUtil, AgentActionUtilConstructor } from './actions/AgentActionUtil'
import { AlignActionUtil } from './actions/AlignActionUtil'
import { AwaitDuoTasksCompletionActionUtil } from './actions/AwaitDuoTasksCompletionActionUtil'
import { AwaitTasksCompletionActionUtil } from './actions/AwaitTasksCompletionActionUtil'
import { BringToFrontActionUtil } from './actions/BringToFrontActionUtil'
import { ChangePageActionUtil } from './actions/ChangePageActionUtil'
import { ClaimTodoItemActionUtil } from './actions/ClaimTodoItemActionUtil'
import { CreateActionUtil } from './actions/CreateActionUtil'
import { CreateDuoTaskActionUtil } from './actions/CreateDuoTaskActionUtil'
import { CreatePageActionUtil } from './actions/CreatePageActionUtil'
import { CreateProjectTaskActionUtil } from './actions/CreateProjectTaskActionUtil'
import { CreateSoloTaskActionUtil } from './actions/CreateSoloTaskActionUtil'
import { DeleteActionUtil } from './actions/DeleteActionUtil'
import { DeleteProjectTaskActionUtil } from './actions/DeleteProjectTaskActionUtil'
import { DirectToStartDuoTaskActionUtil } from './actions/DirectToStartDuoTaskActionUtil'
import { DirectToStartTaskActionUtil } from './actions/DirectToStartTaskActionUtil'
import { DistributeActionUtil } from './actions/DistributeActionUtil'
import { EndCurrentProjectActionUtil } from './actions/EndCurrentProjectActionUtil'
import { EndDuoProjectActionUtil } from './actions/EndDuoProjectActionUtil'
import { FlyToBoundsActionUtil } from './actions/FlyToBoundsActionUtil'
import { LabelActionUtil } from './actions/LabelActionUtil'
import { MarkDroneTaskDoneActionUtil } from './actions/MarkDroneTaskDoneActionUtil'
import { MarkDuoTaskDoneActionUtil } from './actions/MarkDuoTaskDoneActionUtil'
import { MarkSoloTaskDoneActionUtil } from './actions/MarkSoloTaskDoneActionUtil'
import { MessageActionUtil } from './actions/MessageActionUtil'
import { MoveActionUtil } from './actions/MoveActionUtil'
import { PenActionUtil } from './actions/PenActionUtil'
import { PersonalTodoListActionUtil } from './actions/PersonalTodoListActionUtil'
import { PlaceActionUtil } from './actions/PlaceActionUtil'
import { ResizeActionUtil } from './actions/ResizeActionUtil'
import { ReviewActionUtil } from './actions/ReviewActionUtil'
import { RotateActionUtil } from './actions/RotateActionUtil'
import { SendToBackActionUtil } from './actions/SendToBackActionUtil'
import { StackActionUtil } from './actions/StackActionUtil'
import { StartDuoProjectActionUtil } from './actions/StartDuoProjectActionUtil'
import { StartDuoTaskActionUtil } from './actions/StartDuoTaskActionUtil'
import { StartProjectActionUtil } from './actions/StartProjectActionUtil'
import { StartSoloTaskActionUtil } from './actions/StartSoloTaskActionUtil'
import { ThinkActionUtil } from './actions/ThinkActionUtil'
import { UnknownActionUtil } from './actions/UnknownActionUtil'
import { UpdateActionUtil } from './actions/UpdateActionUtil'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { AgentViewportBoundsPartUtil } from './parts/AgentViewportBoundsPartUtil'
import { BlurryShapesPartUtil } from './parts/BlurryShapesPartUtil'
import { CanvasLintsPartUtil } from './parts/CanvasLintsPartUtil'
import { ChatHistoryPartUtil } from './parts/ChatHistoryPartUtil'
import { CurrentProjectDronePartUtil } from './parts/CurrentProjectDronePartUtil'
import { CurrentProjectOrchestratorPartUtil } from './parts/CurrentProjectOrchestratorPartUtil'
import { DataPartUtil } from './parts/DataPartUtil'
import { DebugPartUtil } from './parts/DebugPartUtil'
import { MessagesPartUtil } from './parts/MessagesPartUtil'
import { ModelNamePartUtil } from './parts/ModelNamePartUtil'
import { ModePartUtil } from './parts/ModePartUtil'
import { OtherFairiesPartUtil } from './parts/OtherFairiesPartUtil'
import { PagesPartUtil } from './parts/PagesPartUtil'
import { PeripheralShapesPartUtil } from './parts/PeripheralShapesPartUtil'
import { PersonalityPartUtil } from './parts/PersonalityPartUtil'
import { PersonalTodoListPartUtil } from './parts/PersonalTodoListPartUtil'
import { PromptPartUtil, PromptPartUtilConstructor } from './parts/PromptPartUtil'
import { ScreenshotPartUtil } from './parts/ScreenshotPartUtil'
import { SelectedShapesPartUtil } from './parts/SelectedShapesPartUtil'
import { SoloTasksPartUtil } from './parts/SoloTasksPartUtil'
import { TimePartUtil } from './parts/TimePartUtil'
import { UserActionHistoryPartUtil } from './parts/UserActionHistoryPartUtil'
import { UserViewportBoundsPartUtil } from './parts/UserViewportBoundsPartUtil'
import { WorkingTasksPartUtil } from './parts/WorkingTasksPartUtil'

/**
 * Agent action utils determine what actions do.
 */
export const AGENT_ACTION_UTILS = [
	// Communication
	MessageActionUtil,

	// Planning
	ThinkActionUtil,
	ReviewActionUtil,
	FlyToBoundsActionUtil,
	PersonalTodoListActionUtil,

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

	// Page navigation
	ChangePageActionUtil,
	CreatePageActionUtil,

	// Project management

	// Working
	CreateSoloTaskActionUtil,
	StartSoloTaskActionUtil,
	MarkDroneTaskDoneActionUtil,
	MarkSoloTaskDoneActionUtil,
	ClaimTodoItemActionUtil, // not in use atm

	// Orchestrating
	StartProjectActionUtil,
	CreateProjectTaskActionUtil,
	DeleteProjectTaskActionUtil,
	DirectToStartTaskActionUtil,
	EndCurrentProjectActionUtil,
	AwaitTasksCompletionActionUtil,

	// Duo orchestrating
	StartDuoProjectActionUtil,
	CreateDuoTaskActionUtil,
	DirectToStartDuoTaskActionUtil,
	StartDuoTaskActionUtil,
	EndDuoProjectActionUtil,
	AwaitDuoTasksCompletionActionUtil,
	MarkDuoTaskDoneActionUtil,

	// Internal (required)
	UnknownActionUtil,
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

	// Viewport
	ScreenshotPartUtil,
	UserViewportBoundsPartUtil,
	AgentViewportBoundsPartUtil,

	// Shapes
	BlurryShapesPartUtil,
	PeripheralShapesPartUtil,
	SelectedShapesPartUtil,
	CanvasLintsPartUtil,

	// History
	ChatHistoryPartUtil,
	UserActionHistoryPartUtil,
	SoloTasksPartUtil,
	WorkingTasksPartUtil,
	PersonalTodoListPartUtil,

	// Metadata
	TimePartUtil,
	PagesPartUtil,

	// Fairy-specific
	OtherFairiesPartUtil,
	PersonalityPartUtil,
	ModePartUtil,
	CurrentProjectDronePartUtil,
	CurrentProjectOrchestratorPartUtil,

	// Model selection
	ModelNamePartUtil,

	// Debug
	DebugPartUtil,
] as const satisfies PromptPartUtilConstructor<PromptPart>[]

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
