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
} from './types/AgentActionSchema'

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
]
