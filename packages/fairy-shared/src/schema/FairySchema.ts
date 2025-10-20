import {
	AlignActionSchema,
	BringToFrontActionSchema,
	CreateActionSchema,
	DeleteActionSchema,
	DistributeActionSchema,
	FlyToBoundsActionSchema,
	LabelActionSchema,
	MessageActionSchema,
	MoveActionSchema,
	NoteToSelfActionSchema,
	PenActionSchema,
	PlaceActionSchema,
	ResizeActionSchema,
	ReviewActionSchema,
	RotateActionSchema,
	SendToBackActionSchema,
	StackActionSchema,
	ThinkActionSchema,
	TodoListActionSchema,
	UpdateActionSchema,
} from './AgentActionSchema'
import {
	BlurryShapesPartSchema,
	ChatHistoryPartSchema,
	ContextItemsPartSchema,
	DataPartSchema,
	MessagesPartSchema,
	PeripheralShapesPartSchema,
	ScreenshotPartSchema,
	SelectedShapesPartSchema,
	TimePartSchema,
	TodoListPartSchema,
	UserActionHistoryPartSchema,
	ViewportBoundsPartSchema,
} from './PromptPartSchema'

/**
 * Agent action schemas determine what actions the agent can take.
 */
export const AGENT_ACTION_SCHEMAS = [
	// Communication
	MessageActionSchema,

	// Planning
	ThinkActionSchema,
	ReviewActionSchema,
	TodoListActionSchema,
	FlyToBoundsActionSchema,
	NoteToSelfActionSchema,

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
] as const

/**
 * Prompt part schemas determine what information will be sent to the model.
 */
export const PROMPT_PART_SCHEMAS = [
	BlurryShapesPartSchema,
	ChatHistoryPartSchema,
	ContextItemsPartSchema,
	DataPartSchema,
	MessagesPartSchema,
	PeripheralShapesPartSchema,
	ScreenshotPartSchema,
	SelectedShapesPartSchema,
	TimePartSchema,
	TodoListPartSchema,
	UserActionHistoryPartSchema,
	ViewportBoundsPartSchema,
] as const
