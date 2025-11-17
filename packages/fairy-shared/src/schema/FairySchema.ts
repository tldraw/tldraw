import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPart } from '../types/PromptPart'
import {
	ActivateFairyActionSchema,
	AlignActionSchema,
	AwaitTasksCompletionActionSchema,
	BringToFrontActionSchema,
	ChangePageActionSchema,
	ClaimTodoItemActionSchema,
	CreateActionSchema,
	CreatePageActionSchema,
	CreateProjectTaskActionSchema,
	CreateSoloTaskActionSchema,
	DeleteActionSchema,
	DirectToStartTaskActionSchema,
	DistributeActionSchema,
	EndCurrentProjectActionSchema,
	FlyToBoundsActionSchema,
	LabelActionSchema,
	MarkDroneTaskDoneActionSchema,
	MarkSoloTaskDoneActionSchema,
	MessageActionSchema,
	MoveActionSchema,
	PenActionSchema,
	PersonalTodoListActionSchema,
	PlaceActionSchema,
	ResizeActionSchema,
	ReviewActionSchema,
	RotateActionSchema,
	SendToBackActionSchema,
	SharedTodoListActionSchema,
	SleepActionSchema,
	StackActionSchema,
	StartProjectActionSchema,
	StartSoloTaskActionSchema,
	ThinkActionSchema,
	UpdateActionSchema,
} from './AgentActionSchemas'
import {
	AgentViewportBoundsPartDefinition,
	BlurryShapesPartDefinition,
	ChatHistoryPartDefinition,
	CurrentProjectPartDefinition,
	DataPartDefinition,
	DebugPartDefinition,
	MessagesPartDefinition,
	ModePartDefinition,
	OtherFairiesPartDefinition,
	PagesPartDefinition,
	PeripheralShapesPartDefinition,
	PersonalityPartDefinition,
	PersonalTodoListPartDefinition,
	PromptPartDefinition,
	ScreenshotPartDefinition,
	SelectedShapesPartDefinition,
	SharedTodoListPartDefinition,
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
	PersonalTodoListActionSchema,

	// Individual shapes
	CreateActionSchema,
	DeleteActionSchema,
	UpdateActionSchema,
	LabelActionSchema,
	MoveActionSchema,

	// Groups of shapes
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
	SharedTodoListActionSchema, // not in use atm
	ClaimTodoItemActionSchema, // not in use atm
	DirectToStartTaskActionSchema,
	StartProjectActionSchema,
	EndCurrentProjectActionSchema,
	ActivateFairyActionSchema,
	AwaitTasksCompletionActionSchema,
	CreateSoloTaskActionSchema,
	CreateProjectTaskActionSchema,
	SleepActionSchema,
	StartSoloTaskActionSchema,
	MarkDroneTaskDoneActionSchema,
	MarkSoloTaskDoneActionSchema,
] as const

/**
 * Prompt part schemas determine what information will be sent to the model.
 */
export const PROMPT_PART_DEFINITIONS = [
	BlurryShapesPartDefinition,
	ChatHistoryPartDefinition,
	DataPartDefinition,
	DebugPartDefinition,
	MessagesPartDefinition,
	PagesPartDefinition,
	PeripheralShapesPartDefinition,
	ScreenshotPartDefinition,
	SelectedShapesPartDefinition,
	TimePartDefinition,
	SoloTasksPartDefinition,
	SharedTodoListPartDefinition, // not in use atm
	PersonalTodoListPartDefinition,
	UserActionHistoryPartDefinition,
	UserViewportBoundsPartDefinition,
	AgentViewportBoundsPartDefinition,
	WorkingTasksPartDefinition,
	OtherFairiesPartDefinition,
	PersonalityPartDefinition,
	ModePartDefinition,
	CurrentProjectPartDefinition,
] as const satisfies PromptPartDefinition<BasePromptPart>[]

export const AGENT_ACTION_TYPES = AGENT_ACTION_SCHEMAS.map((schema) => schema.shape._type.value)
export const PROMPT_PART_TYPES = PROMPT_PART_DEFINITIONS.map((definition) => definition.type)

export function getPromptPartDefinition<T extends PromptPart>(
	type: T['type']
): PromptPartDefinition<T> {
	const definition = PROMPT_PART_DEFINITIONS.find((definition) => definition.type === type)
	return definition as PromptPartDefinition<T>
}
