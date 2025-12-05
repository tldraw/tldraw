import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPart } from '../types/PromptPart'
import {
	AbortDuoProjectActionSchema,
	AbortProjectActionSchema,
	ActivateFairyActionSchema,
	AlignActionSchema,
	AwaitDuoTasksCompletionActionSchema,
	AwaitTasksCompletionActionSchema,
	BringToFrontActionSchema,
	ChangePageActionSchema,
	ClaimTodoItemActionSchema,
	CreateActionSchema,
	CreateDuoTaskActionSchema,
	CreatePageActionSchema,
	CreateProjectTaskActionSchema,
	CreateSoloTaskActionSchema,
	DeleteActionSchema,
	DeletePersonalTodoItemsActionSchema,
	DeleteProjectTaskActionSchema,
	DirectToStartDuoTaskActionSchema,
	DirectToStartTaskActionSchema,
	DistributeActionSchema,
	EndCurrentProjectActionSchema,
	EndDuoProjectActionSchema,
	FlyToBoundsActionSchema,
	LabelActionSchema,
	MarkDroneTaskDoneActionSchema,
	MarkDuoTaskDoneActionSchema,
	MarkSoloTaskDoneActionSchema,
	MessageActionSchema,
	MoveActionSchema,
	MovePositionActionSchema,
	OffsetActionSchema,
	PenActionSchema,
	PlaceActionSchema,
	ResizeActionSchema,
	ReviewActionSchema,
	RotateActionSchema,
	SendToBackActionSchema,
	StackActionSchema,
	StartDuoProjectActionSchema,
	StartDuoTaskActionSchema,
	StartProjectActionSchema,
	StartSoloTaskActionSchema,
	ThinkActionSchema,
	UpdateActionSchema,
	UpsertPersonalTodoItemActionSchema,
} from './AgentActionSchemas'
import {
	AgentViewportBoundsPartDefinition,
	BlurryShapesPartDefinition,
	CanvasLintsPartDefinition,
	ChatHistoryPartDefinition,
	CurrentProjectDronePartDefinition,
	CurrentProjectOrchestratorPartDefinition,
	DataPartDefinition,
	DebugPartDefinition,
	MessagesPartDefinition,
	ModelNamePartDefinition,
	ModePartDefinition,
	OtherFairiesPartDefinition,
	PagesPartDefinition,
	PeripheralShapesPartDefinition,
	PersonalTodoListPartDefinition,
	PromptPartDefinition,
	ScreenshotPartDefinition,
	SelectedShapesPartDefinition,
	SignPartDefinition,
	SoloTasksPartDefinition,
	TimePartDefinition,
	UserActionHistoryPartDefinition,
	UserViewportBoundsPartDefinition,
	WorkingTasksPartDefinition,
} from './PromptPartDefinitions'

/**
 * Agent action schemas determine what actions the agent can take.
 */
export const AGENT_ACTION_SCHEMAS = [
	// Communication
	MessageActionSchema,

	// Planning
	ThinkActionSchema,
	ReviewActionSchema,
	FlyToBoundsActionSchema,
	MovePositionActionSchema,
	UpsertPersonalTodoItemActionSchema,
	DeletePersonalTodoItemsActionSchema,

	// Individual shapes
	CreateActionSchema,
	DeleteActionSchema,
	UpdateActionSchema,
	LabelActionSchema,
	MoveActionSchema,

	// Groups of shapes
	OffsetActionSchema,
	PlaceActionSchema,
	BringToFrontActionSchema,
	SendToBackActionSchema,
	RotateActionSchema,
	ResizeActionSchema,
	AlignActionSchema,
	DistributeActionSchema,
	StackActionSchema,

	// Drawing
	PenActionSchema,

	// Page navigation
	ChangePageActionSchema,
	CreatePageActionSchema,

	// Project management
	ClaimTodoItemActionSchema, // not in use atm
	DirectToStartTaskActionSchema,
	DirectToStartDuoTaskActionSchema,
	StartProjectActionSchema,
	StartDuoProjectActionSchema,
	EndCurrentProjectActionSchema,
	EndDuoProjectActionSchema,
	AbortProjectActionSchema,
	AbortDuoProjectActionSchema,
	ActivateFairyActionSchema,
	AwaitTasksCompletionActionSchema,
	AwaitDuoTasksCompletionActionSchema,
	CreateSoloTaskActionSchema,
	CreateProjectTaskActionSchema,
	DeleteProjectTaskActionSchema,
	CreateDuoTaskActionSchema,
	StartSoloTaskActionSchema,
	StartDuoTaskActionSchema,
	MarkDroneTaskDoneActionSchema,
	MarkSoloTaskDoneActionSchema,
	MarkDuoTaskDoneActionSchema,
] as const

/**
 * Prompt part schemas determine what information will be sent to the model.
 */
export const PROMPT_PART_DEFINITIONS = [
	BlurryShapesPartDefinition,
	CanvasLintsPartDefinition,
	ChatHistoryPartDefinition,
	DataPartDefinition,
	DebugPartDefinition,
	MessagesPartDefinition,
	ModelNamePartDefinition,
	PagesPartDefinition,
	PeripheralShapesPartDefinition,
	ScreenshotPartDefinition,
	SelectedShapesPartDefinition,
	TimePartDefinition,
	SoloTasksPartDefinition,
	PersonalTodoListPartDefinition,
	UserActionHistoryPartDefinition,
	UserViewportBoundsPartDefinition,
	AgentViewportBoundsPartDefinition,
	WorkingTasksPartDefinition,
	OtherFairiesPartDefinition,
	SignPartDefinition,
	ModePartDefinition,
	CurrentProjectDronePartDefinition,
	CurrentProjectOrchestratorPartDefinition,
] as const satisfies PromptPartDefinition<BasePromptPart>[]

export const AGENT_ACTION_TYPES = AGENT_ACTION_SCHEMAS.map((schema) => schema.shape._type.value)
export const PROMPT_PART_TYPES = PROMPT_PART_DEFINITIONS.map((definition) => definition.type)

export function getPromptPartDefinition<T extends PromptPart>(
	type: T['type']
): PromptPartDefinition<T> {
	const definition = PROMPT_PART_DEFINITIONS.find((definition) => definition.type === type)
	return definition as PromptPartDefinition<T>
}
