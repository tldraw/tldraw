import { AgentAction, PromptPart } from '@tldraw/fairy-shared'
import { AbortDuoProjectActionUtil } from '../fairy-actions/AbortDuoProjectActionUtil'
import { AbortProjectActionUtil } from '../fairy-actions/AbortProjectActionUtil'
import { AgentActionUtil, AgentActionUtilConstructor } from '../fairy-actions/AgentActionUtil'
import { AlignActionUtil } from '../fairy-actions/AlignActionUtil'
import { AwaitDuoTasksCompletionActionUtil } from '../fairy-actions/AwaitDuoTasksCompletionActionUtil'
import { AwaitTasksCompletionActionUtil } from '../fairy-actions/AwaitTasksCompletionActionUtil'
import { BringToFrontActionUtil } from '../fairy-actions/BringToFrontActionUtil'
import { ChangePageActionUtil } from '../fairy-actions/ChangePageActionUtil'
import { ClaimTodoItemActionUtil } from '../fairy-actions/ClaimTodoItemActionUtil'
import { CreateActionUtil } from '../fairy-actions/CreateActionUtil'
import { CreateDuoTaskActionUtil } from '../fairy-actions/CreateDuoTaskActionUtil'
import { CreatePageActionUtil } from '../fairy-actions/CreatePageActionUtil'
import { CreateProjectTaskActionUtil } from '../fairy-actions/CreateProjectTaskActionUtil'
import { CreateSoloTaskActionUtil } from '../fairy-actions/CreateSoloTaskActionUtil'
import { DeleteActionUtil } from '../fairy-actions/DeleteActionUtil'
import { DeletePersonalTodoItemsActionUtil } from '../fairy-actions/DeletePersonalTodoItemsActionUtil'
import { DeleteProjectTaskActionUtil } from '../fairy-actions/DeleteProjectTaskActionUtil'
import { DirectToStartDuoTaskActionUtil } from '../fairy-actions/DirectToStartDuoTaskActionUtil'
import { DirectToStartTaskActionUtil } from '../fairy-actions/DirectToStartTaskActionUtil'
import { DistributeActionUtil } from '../fairy-actions/DistributeActionUtil'
import { EndCurrentProjectActionUtil } from '../fairy-actions/EndCurrentProjectActionUtil'
import { EndDuoProjectActionUtil } from '../fairy-actions/EndDuoProjectActionUtil'
import { FlyToBoundsActionUtil } from '../fairy-actions/FlyToBoundsActionUtil'
import { LabelActionUtil } from '../fairy-actions/LabelActionUtil'
import { MarkDroneTaskDoneActionUtil } from '../fairy-actions/MarkDroneTaskDoneActionUtil'
import { MarkDuoTaskDoneActionUtil } from '../fairy-actions/MarkDuoTaskDoneActionUtil'
import { MarkSoloTaskDoneActionUtil } from '../fairy-actions/MarkSoloTaskDoneActionUtil'
import { MessageActionUtil } from '../fairy-actions/MessageActionUtil'
import { MoveActionUtil } from '../fairy-actions/MoveActionUtil'
import { MovePositionActionUtil } from '../fairy-actions/MovePositionActionUtil'
import { OffsetActionUtil } from '../fairy-actions/OffsetActionUtil'
import { PenActionUtil } from '../fairy-actions/PenActionUtil'
import { PlaceActionUtil } from '../fairy-actions/PlaceActionUtil'
import { ResizeActionUtil } from '../fairy-actions/ResizeActionUtil'
import { ReviewActionUtil } from '../fairy-actions/ReviewActionUtil'
import { RotateActionUtil } from '../fairy-actions/RotateActionUtil'
import { SendToBackActionUtil } from '../fairy-actions/SendToBackActionUtil'
import { StackActionUtil } from '../fairy-actions/StackActionUtil'
import { StartDuoProjectActionUtil } from '../fairy-actions/StartDuoProjectActionUtil'
import { StartDuoTaskActionUtil } from '../fairy-actions/StartDuoTaskActionUtil'
import { StartProjectActionUtil } from '../fairy-actions/StartProjectActionUtil'
import { StartSoloTaskActionUtil } from '../fairy-actions/StartSoloTaskActionUtil'
import { ThinkActionUtil } from '../fairy-actions/ThinkActionUtil'
import { UnknownActionUtil } from '../fairy-actions/UnknownActionUtil'
import { UpdateActionUtil } from '../fairy-actions/UpdateActionUtil'
import { UpsertPersonalTodoItemActionUtil } from '../fairy-actions/UpsertPersonalTodoItemActionUtil'
import { FairyAgent } from '../fairy-agent/FairyAgent'
import { AgentViewportBoundsPartUtil } from './AgentViewportBoundsPartUtil'
import { BlurryShapesPartUtil } from './BlurryShapesPartUtil'
import { CanvasLintsPartUtil } from './CanvasLintsPartUtil'
import { ChatHistoryPartUtil } from './ChatHistoryPartUtil'
import { CurrentProjectDronePartUtil } from './CurrentProjectDronePartUtil'
import { CurrentProjectOrchestratorPartUtil } from './CurrentProjectOrchestratorPartUtil'
import { DataPartUtil } from './DataPartUtil'
import { DebugPartUtil } from './DebugPartUtil'
import { MessagesPartUtil } from './MessagesPartUtil'
import { ModelNamePartUtil } from './ModelNamePartUtil'
import { ModePartUtil } from './ModePartUtil'
import { OtherFairiesPartUtil } from './OtherFairiesPartUtil'
import { PagesPartUtil } from './PagesPartUtil'
import { PeripheralShapesPartUtil } from './PeripheralShapesPartUtil'
import { PersonalTodoListPartUtil } from './PersonalTodoListPartUtil'
import { PromptPartUtil, PromptPartUtilConstructor } from './PromptPartUtil'
import { ScreenshotPartUtil } from './ScreenshotPartUtil'
import { SelectedShapesPartUtil } from './SelectedShapesPartUtil'
import { SignPartUtil } from './SignPartUtil'
import { SoloTasksPartUtil } from './SoloTasksPartUtil'
import { TimePartUtil } from './TimePartUtil'
import { UserActionHistoryPartUtil } from './UserActionHistoryPartUtil'
import { UserViewportBoundsPartUtil } from './UserViewportBoundsPartUtil'
import { WorkingTasksPartUtil } from './WorkingTasksPartUtil'

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
	MovePositionActionUtil,
	UpsertPersonalTodoItemActionUtil,
	DeletePersonalTodoItemsActionUtil,

	// Individual shapes
	CreateActionUtil,
	DeleteActionUtil,
	UpdateActionUtil,
	LabelActionUtil,
	MoveActionUtil,

	// Groups of shapes
	OffsetActionUtil,
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
	AbortProjectActionUtil,
	AwaitTasksCompletionActionUtil,

	// Duo orchestrating
	StartDuoProjectActionUtil,
	CreateDuoTaskActionUtil,
	DirectToStartDuoTaskActionUtil,
	StartDuoTaskActionUtil,
	EndDuoProjectActionUtil,
	AbortDuoProjectActionUtil,
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
	SignPartUtil,
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
