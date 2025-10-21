import { AlignActionSchema } from './actions/AlignActionSchema'
import { BringToFrontActionSchema } from './actions/BringToFrontActionSchema'
import { CreateActionSchema } from './actions/CreateActionSchema'
import { DeleteActionSchema } from './actions/DeleteActionSchema'
import { DistributeActionSchema } from './actions/DistributeActionSchema'
import { FlyToBoundsActionSchema } from './actions/FlyToBoundsActionSchema'
import { LabelActionSchema } from './actions/LabelActionSchema'
import { MessageActionSchema } from './actions/MessageActionSchema'
import { MoveActionSchema } from './actions/MoveActionSchema'
import { NoteToSelfActionSchema } from './actions/NoteToSelfActionSchema'
import { PenActionSchema } from './actions/PenActionSchema'
import { PlaceActionSchema } from './actions/PlaceActionSchema'
import { ResizeActionSchema } from './actions/ResizeActionSchema'
import { ReviewActionSchema } from './actions/ReviewActionSchema'
import { RotateActionSchema } from './actions/RotateActionSchema'
import { SendToBackActionSchema } from './actions/SendToBackActionSchema'
import { StackActionSchema } from './actions/StackActionSchema'
import { ThinkActionSchema } from './actions/ThinkActionSchema'
import { TodoListActionSchema } from './actions/TodoListActionSchema'
import { UpdateActionSchema } from './actions/UpdateActionSchema'
import { BlurryShapesPartSchema } from './parts/BlurryShapesPartSchema'
import { ChatHistoryPartSchema } from './parts/ChatHistoryPartSchema'
import { ContextItemsPartSchema } from './parts/ContextItemsPartSchema'
import { DataPartSchema } from './parts/DataPartSchema'
import { MessagesPartSchema } from './parts/MessagesPartSchema'
import { PeripheralShapesPartSchema } from './parts/PeripheralShapesPartSchema'
import { ScreenshotPartSchema } from './parts/ScreenshotPartSchema'
import { SelectedShapesPartSchema } from './parts/SelectedShapesPartSchema'
import { TimePartSchema } from './parts/TimePartSchema'
import { TodoListPartSchema } from './parts/TodoListPartSchema'
import { UserActionHistoryPartSchema } from './parts/UserActionHistoryPartSchema'
import { ViewportBoundsPartSchema } from './parts/ViewportBoundsPartSchema'

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

export const AGENT_ACTION_TYPES = AGENT_ACTION_SCHEMAS.map((schema) => schema.shape._type.value)
export const PROMPT_PART_TYPES = PROMPT_PART_SCHEMAS.map((schema) => schema.shape.type.value)
