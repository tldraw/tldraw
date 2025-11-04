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
import { BlurryShapesPartSchema } from './parts/BlurryShapesPartSchema'
import { ChatHistoryPartSchema } from './parts/ChatHistoryPartSchema'
import { ContextItemsPartSchema } from './parts/ContextItemsPartSchema'
import { CurrentProjectPartSchema } from './parts/CurrentProjectPartSchema'
import { DataPartSchema } from './parts/DataPartSchema'
import { MessagesPartSchema } from './parts/MessagesPartSchema'
import { OtherFairiesPartSchema } from './parts/OtherFairiesPartSchema'
import { PeripheralShapesPartSchema } from './parts/PeripheralShapesPartSchema'
import { PersonalityPartSchema } from './parts/PersonalityPartSchema'
import { ScreenshotPartSchema } from './parts/ScreenshotPartSchema'
import { SelectedShapesPartSchema } from './parts/SelectedShapesPartSchema'
import { SharedTodoListPartSchema } from './parts/SharedTodoListPartSchema'
import { TimePartSchema } from './parts/TimePartSchema'
import { UserActionHistoryPartSchema } from './parts/UserActionHistoryPartSchema'
import { ViewportBoundsPartSchema } from './parts/ViewportBoundsPartSchema'
import { WandPartSchema } from './parts/WandPartSchema'

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
