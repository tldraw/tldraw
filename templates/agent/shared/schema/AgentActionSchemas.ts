import z from 'zod'
import { SimpleColor } from '../format/SimpleColor'
import { SimpleFillSchema } from '../format/SimpleFill'
import { SimpleShapeSchema } from '../format/SimpleShape'
import { SimpleShapeIdSchema } from '../types/ids-schema'

// Add Detail Action
export const AddDetailAction = z
	.object({
		_type: z.literal('add-detail'),
		intent: z.string(),
	})
	.meta({
		title: 'Add Detail',
		description: 'The AI plans further work so that it can add detail to its work.',
	})

export type AddDetailAction = z.infer<typeof AddDetailAction>

// Align Action
export const AlignAction = z
	.object({
		_type: z.literal('align'),
		alignment: z.enum(['top', 'bottom', 'left', 'right', 'center-horizontal', 'center-vertical']),
		gap: z.number(),
		intent: z.string(),
		shapeIds: z.array(SimpleShapeIdSchema),
	})
	.meta({ title: 'Align', description: 'The AI aligns shapes to each other on an axis.' })

export type AlignAction = z.infer<typeof AlignAction>

// Bring to Front Action
export const BringToFrontAction = z
	.object({
		_type: z.literal('bringToFront'),
		intent: z.string(),
		shapeIds: z.array(SimpleShapeIdSchema),
	})
	.meta({
		title: 'Bring to Front',
		description:
			'The AI brings one or more shapes to the front so that they appear in front of everything else.',
	})

export type BringToFrontAction = z.infer<typeof BringToFrontAction>

// Clear Action
export const ClearAction = z
	.object({
		_type: z.literal('clear'),
	})
	.meta({
		title: 'Clear',
		description: 'The agent deletes all shapes on the canvas.',
	})

export type ClearAction = z.infer<typeof ClearAction>

// Count Shapes Action
export const CountShapesAction = z
	.object({
		_type: z.literal('count'),
		expression: z.string(),
	})
	.meta({
		title: 'Count',
		description:
			'The AI requests to count the number of shapes in the canvas. The answer will be provided to the AI in a follow-up request.',
	})

export type CountShapesAction = z.infer<typeof CountShapesAction>

// Country Info Action
export const CountryInfoAction = z
	.object({
		_type: z.literal('countryInfo'),
		code: z.string(),
	})
	.meta({
		title: 'Country info',
		description:
			'The AI gets information about a country by providing its country code, eg: "de" for Germany.',
	})

export type CountryInfoAction = z.infer<typeof CountryInfoAction>

// Create Action
export const CreateAction = z
	.object({
		_type: z.literal('create'),
		intent: z.string(),
		shape: SimpleShapeSchema,
	})
	.meta({ title: 'Create', description: 'The AI creates a new shape.' })

export type CreateAction = z.infer<typeof CreateAction>

// Delete Action
export const DeleteAction = z
	.object({
		_type: z.literal('delete'),
		intent: z.string(),
		shapeId: SimpleShapeIdSchema,
	})
	.meta({ title: 'Delete', description: 'The AI deletes a shape.' })

export type DeleteAction = z.infer<typeof DeleteAction>

// Distribute Action
export const DistributeAction = z
	.object({
		_type: z.literal('distribute'),
		direction: z.enum(['horizontal', 'vertical']),
		intent: z.string(),
		shapeIds: z.array(SimpleShapeIdSchema),
	})
	.meta({
		title: 'Distribute',
		description: 'The AI distributes shapes horizontally or vertically.',
	})

export type DistributeAction = z.infer<typeof DistributeAction>

// Label Action
export const LabelAction = z
	.object({
		_type: z.literal('label'),
		intent: z.string(),
		shapeId: SimpleShapeIdSchema,
		text: z.string(),
	})
	.meta({ title: 'Label', description: "The AI changes a shape's text." })

export type LabelAction = z.infer<typeof LabelAction>

// Message Action
export const MessageAction = z
	.object({
		_type: z.literal('message'),
		text: z.string(),
	})
	.meta({ title: 'Message', description: 'The AI sends a message to the user.' })

export type MessageAction = z.infer<typeof MessageAction>

// Move Action
export const MoveAction = z
	.object({
		_type: z.literal('move'),
		intent: z.string(),
		shapeId: SimpleShapeIdSchema,
		x: z.number(),
		y: z.number(),
	})
	.meta({ title: 'Move', description: 'The AI moves a shape to a new position.' })

export type MoveAction = z.infer<typeof MoveAction>

// Pen Action
export const PenAction = z
	.object({
		_type: z.literal('pen'),
		color: SimpleColor,
		closed: z.boolean(),
		fill: SimpleFillSchema,
		intent: z.string(),
		points: z.array(
			z.object({
				x: z.number(),
				y: z.number(),
			})
		),
		style: z.enum(['smooth', 'straight']),
	})
	.meta({
		title: 'Pen',
		description:
			'The AI draws a freeform line with a pen. This is useful for drawing custom paths that are not available with the other available shapes. The "smooth" style will automatically smooth the line between points. The "straight" style will render a straight line between points. The "closed" property will determine if the drawn line gets automatically closed to form a complete shape or not. Remember that the pen will be *down* until the action is over. If you want to lift up the pen, start a new pen action.',
	})

export type PenAction = z.infer<typeof PenAction>

// Place Action
export const PlaceAction = z
	.object({
		_type: z.literal('place'),
		align: z.enum(['start', 'center', 'end']),
		alignOffset: z.number(),
		intent: z.string(),
		referenceShapeId: SimpleShapeIdSchema,
		side: z.enum(['top', 'bottom', 'left', 'right']),
		sideOffset: z.number(),
		shapeId: SimpleShapeIdSchema,
	})
	.meta({ title: 'Place', description: 'The AI places a shape relative to another shape.' })

export type PlaceAction = z.infer<typeof PlaceAction>

// Random Wikipedia Article Action
export const RandomWikipediaArticleAction = z
	.object({
		_type: z.literal('getInspiration'),
	})
	.meta({
		title: 'Get inspiration',
		description: 'The AI gets inspiration from a random Wikipedia article.',
	})

export type RandomWikipediaArticleAction = z.infer<typeof RandomWikipediaArticleAction>

// Resize Action
export const ResizeAction = z
	.object({
		_type: z.literal('resize'),
		intent: z.string(),
		originX: z.number(),
		originY: z.number(),
		scaleX: z.number(),
		scaleY: z.number(),
		shapeIds: z.array(SimpleShapeIdSchema),
	})
	.meta({
		title: 'Resize',
		description:
			'The AI resizes one or more shapes, with the resize operation being performed relative to an origin point.',
	})

export type ResizeAction = z.infer<typeof ResizeAction>

// Review Action
export const ReviewAction = z
	.object({
		_type: z.literal('review'),
		intent: z.string(),
		x: z.number(),
		y: z.number(),
		w: z.number(),
		h: z.number(),
	})
	.meta({
		title: 'Review',
		description:
			'The AI schedules further work or a review so that it can look at the results of its work so far and take further action, such as reviewing what it has done or taking further steps that would benefit from seeing the results of its work so far.',
	})

export type ReviewAction = z.infer<typeof ReviewAction>

// Rotate Action
export const RotateAction = z
	.object({
		_type: z.literal('rotate'),
		centerY: z.number(),
		degrees: z.number(),
		intent: z.string(),
		originX: z.number(),
		originY: z.number(),
		shapeIds: z.array(SimpleShapeIdSchema),
	})
	.meta({
		title: 'Rotate',
		description: 'The AI rotates one or more shapes around an origin point.',
	})

export type RotateAction = z.infer<typeof RotateAction>

// Send to Back Action
export const SendToBackAction = z
	.object({
		_type: z.literal('sendToBack'),
		intent: z.string(),
		shapeIds: z.array(SimpleShapeIdSchema),
	})
	.meta({
		title: 'Send to Back',
		description:
			'The AI sends one or more shapes to the back so that they appear behind everything else.',
	})

export type SendToBackAction = z.infer<typeof SendToBackAction>

// Set My View Action
export const SetMyViewAction = z
	.object({
		_type: z.literal('setMyView'),
		intent: z.string(),
		x: z.number(),
		y: z.number(),
		w: z.number(),
		h: z.number(),
	})
	.meta({
		title: 'Set My View',
		description:
			'The AI changes the bounds of its own viewport to navigate to other areas of the canvas if needed.',
	})

export type SetMyViewAction = z.infer<typeof SetMyViewAction>

// Stack Action
export const StackAction = z
	.object({
		_type: z.literal('stack'),
		direction: z.enum(['vertical', 'horizontal']),
		gap: z.number(),
		intent: z.string(),
		shapeIds: z.array(SimpleShapeIdSchema),
	})
	.meta({
		title: 'Stack',
		description:
			"The AI stacks shapes horizontally or vertically. Note that this doesn't align shapes, it only stacks them along one axis.",
	})

export type StackAction = z.infer<typeof StackAction>

// Think Action
export const ThinkAction = z
	.object({
		_type: z.literal('think'),
		text: z.string(),
	})
	.meta({ title: 'Think', description: 'The AI describes its intent or reasoning.' })

export type ThinkAction = z.infer<typeof ThinkAction>

// Todo List Action
export const TodoListAction = z
	.object({
		_type: z.literal('update-todo-list'),
		id: z.number(),
		status: z.enum(['todo', 'in-progress', 'done']),
		text: z.string(),
	})
	.meta({
		title: 'Update Todo List',
		description: 'The AI updates a current todo list item or creates a new one',
	})

export type TodoListAction = z.infer<typeof TodoListAction>

// Update Action
export const UpdateAction = z
	.object({
		_type: z.literal('update'),
		intent: z.string(),
		update: SimpleShapeSchema,
	})
	.meta({
		title: 'Update',
		description: 'The AI updates an existing shape.',
	})

export type UpdateAction = z.infer<typeof UpdateAction>
// Unknown Action (catch-all for unrecognized actions)
export const UnknownAction = z
	.object({
		_type: z.literal('unknown'),
	})
	.meta({
		title: 'Unknown',
		description: 'An action with an unknown or unrecognized type.',
	})

export type UnknownAction = z.infer<typeof UnknownAction>
