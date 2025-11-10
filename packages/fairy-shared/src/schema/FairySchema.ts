import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPart } from '../types/PromptPart'
import {
	ActivateFairyActionSchema,
	AlignActionSchema,
	AssignTaskActionSchema,
	BringToFrontActionSchema,
	ChangePageActionSchema,
	ClaimTodoItemActionSchema,
	CreateActionSchema,
	CreatePageActionSchema,
	CreateProjectTaskActionSchema,
	CreateSoloTaskActionSchema,
	DeleteActionSchema,
	DistributeActionSchema,
	EndCurrentProjectActionSchema,
	FlyToBoundsActionSchema,
	LabelActionSchema,
	MarkTaskDoneActionSchema,
	MessageActionSchema,
	MoveActionSchema,
	PenActionSchema,
	PlaceActionSchema,
	ResizeActionSchema,
	ReviewActionSchema,
	RotateActionSchema,
	SendToBackActionSchema,
	SharedTodoListActionSchema,
	SleepActionSchema,
	StackActionSchema,
	StartProjectActionSchema,
	StartTaskActionSchema,
	ThinkActionSchema,
	UpdateActionSchema,
} from './AgentActionSchemas'
import {
	BlurryShapesPartDefinition,
	ChatHistoryPartDefinition,
	DataPartDefinition,
	DebugPartDefinition,
	MessagesPartDefinition,
	ModePartDefinition,
	OtherFairiesPartDefinition,
	PagesPartDefinition,
	PeripheralShapesPartDefinition,
	PersonalityPartDefinition,
	ProjectsPartDefinition,
	PromptPartDefinition,
	ScreenshotPartDefinition,
	SelectedShapesPartDefinition,
	SoloTasksPartDefinition,
	TimePartDefinition,
	UserActionHistoryPartDefinition,
	ViewportBoundsPartDefinition,
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
	SharedTodoListActionSchema,
	ClaimTodoItemActionSchema,
	AssignTaskActionSchema,
	StartProjectActionSchema,
	EndCurrentProjectActionSchema,
	ActivateFairyActionSchema,
	CreateSoloTaskActionSchema,
	CreateProjectTaskActionSchema,
	SleepActionSchema,
	StartTaskActionSchema,
	MarkTaskDoneActionSchema,
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
	UserActionHistoryPartDefinition,
	ViewportBoundsPartDefinition,
	WorkingTasksPartDefinition,
	OtherFairiesPartDefinition,
	PersonalityPartDefinition,
	ModePartDefinition,
	ProjectsPartDefinition,
] as const satisfies PromptPartDefinition<BasePromptPart>[]

export const AGENT_ACTION_TYPES = AGENT_ACTION_SCHEMAS.map((schema) => schema.shape._type.value)
export const PROMPT_PART_TYPES = PROMPT_PART_DEFINITIONS.map((definition) => definition.type)

export function getPromptPartDefinition<T extends PromptPart>(
	type: T['type']
): PromptPartDefinition<T> {
	const definition = PROMPT_PART_DEFINITIONS.find((definition) => definition.type === type)
	return definition as PromptPartDefinition<T>
}
