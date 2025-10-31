import { AlignActionSchema } from './actions/AlignActionSchema'
import { AssignTodoItemActionSchema } from './actions/AssignTodoItemActionSchema'
import { BringToFrontActionSchema } from './actions/BringToFrontActionSchema'
import { CreateActionSchema } from './actions/CreateActionSchema'
import { DeleteActionSchema } from './actions/DeleteActionSchema'
import { DistributeActionSchema } from './actions/DistributeActionSchema'
import { FlyToBoundsActionSchema } from './actions/FlyToBoundsActionSchema'
import { ImbuePersonalityActionSchema } from './actions/ImbuePersonalityActionSchema'
import { LabelActionSchema } from './actions/LabelActionSchema'
import { MessageActionSchema } from './actions/MessageActionSchema'
import { MoveActionSchema } from './actions/MoveActionSchema'
import { PenActionSchema } from './actions/PenActionSchema'
import { PlaceActionSchema } from './actions/PlaceActionSchema'
import { ResizeActionSchema } from './actions/ResizeActionSchema'
import { ReviewActionSchema } from './actions/ReviewActionSchema'
import { RotateActionSchema } from './actions/RotateActionSchema'
import { SendToBackActionSchema } from './actions/SendToBackActionSchema'
import { SharedTodoListActionSchema } from './actions/SharedTodoListActionSchema'
import { StackActionSchema } from './actions/StackActionSchema'
import { ThinkActionSchema } from './actions/ThinkActionSchema'
import { UpdateActionSchema } from './actions/UpdateActionSchema'
import { BlurryShapesPartSchema } from './parts/BlurryShapesPartSchema'
import { ChatHistoryPartSchema } from './parts/ChatHistoryPartSchema'
import { ContextItemsPartSchema } from './parts/ContextItemsPartSchema'
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
