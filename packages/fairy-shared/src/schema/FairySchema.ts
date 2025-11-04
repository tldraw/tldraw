import {
	AlignActionSchema,
	AssignTodoItemActionSchema,
	BringToFrontActionSchema,
	CreateActionSchema,
	DeleteActionSchema,
	DistributeActionSchema,
	EndCurrentProjectActionSchema,
	EnterOrchestrationModeActionSchema,
	FlyToBoundsActionSchema,
	ImbuePersonalityActionSchema,
	LabelActionSchema,
	MessageActionSchema,
	MoveActionSchema,
	PenActionSchema,
	PlaceActionSchema,
	ResizeActionSchema,
	ReviewActionSchema,
	RotateActionSchema,
	SendToBackActionSchema,
	SharedTodoListActionSchema,
	StackActionSchema,
	StartProjectActionSchema,
	ThinkActionSchema,
	UpdateActionSchema,
} from './actions/ActionSchemas'
import {
	BlurryShapesPartSchema,
	ChatHistoryPartSchema,
	ContextItemsPartSchema,
	CurrentProjectPartSchema,
	DataPartSchema,
	MessagesPartSchema,
	OtherFairiesPartSchema,
	PeripheralShapesPartSchema,
	PersonalityPartSchema,
	ScreenshotPartSchema,
	SelectedShapesPartSchema,
	SharedTodoListPartSchema,
	TimePartSchema,
	UserActionHistoryPartSchema,
	ViewportBoundsPartSchema,
	WandPartSchema,
} from './parts/PartSchemas'

/**
 * Agent action schemas determine what actions the agent can take.
 */
export const AGENT_ACTION_SCHEMAS = [
	// Communication
	MessageActionSchema,

	// Planning
	ThinkActionSchema,
	ReviewActionSchema,
	SharedTodoListActionSchema,
	FlyToBoundsActionSchema,
	EnterOrchestrationModeActionSchema,

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

	// Fairy-specific
	ImbuePersonalityActionSchema,
	StartProjectActionSchema,
	EndCurrentProjectActionSchema,

	// Assign todo item
	AssignTodoItemActionSchema,
] as const

/**
 * Prompt part schemas determine what information will be sent to the model.
 */
export const PROMPT_PART_SCHEMAS = [
	BlurryShapesPartSchema,
	ChatHistoryPartSchema,
	ContextItemsPartSchema,
	CurrentProjectPartSchema,
	DataPartSchema,
	MessagesPartSchema,
	PeripheralShapesPartSchema,
	ScreenshotPartSchema,
	SelectedShapesPartSchema,
	TimePartSchema,
	SharedTodoListPartSchema,
	UserActionHistoryPartSchema,
	ViewportBoundsPartSchema,
	OtherFairiesPartSchema,
	WandPartSchema,
	PersonalityPartSchema,
] as const

export const AGENT_ACTION_TYPES = AGENT_ACTION_SCHEMAS.map((schema) => schema.shape._type.value)
export const PROMPT_PART_TYPES = PROMPT_PART_SCHEMAS.map((schema) => schema.shape.type.value)
