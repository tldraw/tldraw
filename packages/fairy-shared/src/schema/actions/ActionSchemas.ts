import z from 'zod'
import { FocusColorSchema } from '../../format/FocusColor'
import { FocusFillSchema } from '../../format/FocusFill'
import { FocusedShapeSchema } from '../../format/FocusedShape'
import { BaseAgentAction } from '../../types/BaseAgentAction'

export const AlignActionSchema = z
	.object({
		_type: z.literal('align'),
		alignment: z.enum(['top', 'bottom', 'left', 'right', 'center-horizontal', 'center-vertical']),
		gap: z.number(),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({ title: 'Align', description: 'The fairy aligns shapes to each other on an axis.' })

export type AlignAction = z.infer<typeof AlignActionSchema>

export const AssignTodoItemActionSchema = z
	.object({
		_type: z.literal('assign-todo-item'),
		otherFairyId: z.string(),
		todoItemIds: z.array(z.number()),
	})
	.meta({
		title: 'Assign todo item',
		description: 'The fairy asks another fairy to help out with a todo item.',
	})

export type AssignTodoItemAction = z.infer<typeof AssignTodoItemActionSchema>

export const BringToFrontActionSchema = z
	.object({
		_type: z.literal('bring-to-front'),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Bring to Front',
		description:
			'The fairy brings one or more shapes to the front so that they appear in front of everything else.',
	})

export type BringToFrontAction = z.infer<typeof BringToFrontActionSchema>

export const ClearActionSchema = z
	.object({
		_type: z.literal('clear'),
	})
	.meta({
		title: 'Clear',
		description: 'The agent deletes all shapes on the canvas.',
	})

export type ClearAction = z.infer<typeof ClearActionSchema>

export const CountryInfoActionSchema = z
	.object({
		_type: z.literal('country-info'),
		code: z.string(),
	})
	.meta({
		title: 'Country info',
		description:
			'The fairy gets information about a country by providing its country code, eg: "de" for Germany.',
	})

export type CountryInfoAction = z.infer<typeof CountryInfoActionSchema>

export const CreateActionSchema = z
	.object({
		_type: z.literal('create'),
		intent: z.string(),
		shape: FocusedShapeSchema,
	})
	.meta({ title: 'Create', description: 'The fairy creates a new shape.' })

export type CreateAction = z.infer<typeof CreateActionSchema>

export const DeleteActionSchema = z
	.object({
		_type: z.literal('delete'),
		intent: z.string(),
		shapeId: z.string(),
	})
	.meta({ title: 'Delete', description: 'The fairy deletes a shape.' })

export type DeleteAction = z.infer<typeof DeleteActionSchema>

export const DistributeActionSchema = z
	.object({
		_type: z.literal('distribute'),
		direction: z.enum(['horizontal', 'vertical']),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Distribute',
		description: 'The fairy distributes shapes horizontally or vertically.',
	})

export type DistributeAction = z.infer<typeof DistributeActionSchema>

export const EndCurrentProjectActionSchema = z
	.object({
		_type: z.literal('end-current-project'),
	})
	.meta({
		title: 'End Current Project',
		description: 'The fairy ends the currently active project.',
	})

export type EndCurrentProjectAction = z.infer<typeof EndCurrentProjectActionSchema>

export const EnterOrchestrationModeActionSchema = z
	.object({
		_type: z.literal('enter-orchestration-mode'),
	})
	.meta({
		title: 'Enter Orchestration Mode',
		description: 'The fairy schedules a request to enter orchestration mode.',
	})

export type EnterOrchestrationModeAction = z.infer<typeof EnterOrchestrationModeActionSchema>

export const FlyToBoundsActionSchema = z
	.object({
		_type: z.literal('fly-to-bounds'),
		intent: z.string(),
		x: z.number(),
		y: z.number(),
		w: z.number(),
		h: z.number(),
	})
	.meta({
		title: 'Fly To Bounds',
		description:
			'The fairy flies to the specified bounds of the canvas to navigate to other areas of the canvas if needed.',
	})

export type FlyToBoundsAction = z.infer<typeof FlyToBoundsActionSchema>

export const ImbuePersonalityActionSchema = z
	.object({
		_type: z.literal('imbue-personality'),
		imbuedMessage: z.string(),
	})
	.meta({ title: 'Imbue personality', description: 'The fairy turns the user' })

export type ImbuePersonalityAction = z.infer<typeof ImbuePersonalityActionSchema>

export const LabelActionSchema = z
	.object({
		_type: z.literal('label'),
		intent: z.string(),
		shapeId: z.string(),
		text: z.string(),
	})
	.meta({ title: 'Label', description: "The fairy changes a shape's text." })

export type LabelAction = z.infer<typeof LabelActionSchema>

export const MessageActionSchema = z
	.object({
		_type: z.literal('message'),
		text: z.string(),
	})
	.meta({ title: 'Message', description: 'The fairy sends a message to the user.' })

export type MessageAction = z.infer<typeof MessageActionSchema>

export const MoveActionSchema = z
	.object({
		_type: z.literal('move'),
		intent: z.string(),
		shapeId: z.string(),
		x: z.number(),
		y: z.number(),
	})
	.meta({ title: 'Move', description: 'The fairy moves a shape to a new position.' })

export type MoveAction = z.infer<typeof MoveActionSchema>

export const PenActionSchema = z
	.object({
		_type: z.literal('pen'),
		color: FocusColorSchema,
		closed: z.boolean(),
		fill: FocusFillSchema,
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
			'The fairy draws a freeform line with a pen. This is useful for drawing custom paths that are not available with the other available shapes. The "smooth" style will automatically smooth the line between points. The "straight" style will render a straight line between points. The "closed" property will determine if the drawn line gets automatically closed to form a complete shape or not. Remember that the pen will be *down* until the action is over. If you want to lift up the pen, start a new pen action.',
	})

export type PenAction = z.infer<typeof PenActionSchema>

export const PlaceActionSchema = z
	.object({
		_type: z.literal('place'),
		align: z.enum(['start', 'center', 'end']),
		alignOffset: z.number(),
		intent: z.string(),
		referenceShapeId: z.string(),
		side: z.enum(['top', 'bottom', 'left', 'right']),
		sideOffset: z.number(),
		shapeId: z.string(),
	})
	.meta({ title: 'Place', description: 'The fairy places a shape relative to another shape.' })

export type PlaceAction = z.infer<typeof PlaceActionSchema>

export const ResizeActionSchema = z
	.object({
		_type: z.literal('resize'),
		intent: z.string(),
		originX: z.number(),
		originY: z.number(),
		scaleX: z.number(),
		scaleY: z.number(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Resize',
		description:
			'The fairy resizes one or more shapes, with the resize operation being performed relative to an origin point.',
	})

export type ResizeAction = z.infer<typeof ResizeActionSchema>

export const ReviewActionSchema = z
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
			'The fairy schedules further work or a review so that it can look at the results of its work so far and take further action, such as reviewing what it has done or taking further steps that would benefit from seeing the results of its work so far.',
	})

export type ReviewAction = z.infer<typeof ReviewActionSchema>

export const RotateActionSchema = z
	.object({
		_type: z.literal('rotate'),
		centerY: z.number(),
		degrees: z.number(),
		intent: z.string(),
		originX: z.number(),
		originY: z.number(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Rotate',
		description: 'The fairy rotates one or more shapes around an origin point.',
	})

export type RotateAction = z.infer<typeof RotateActionSchema>

export const SendToBackActionSchema = z
	.object({
		_type: z.literal('send-to-back'),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Send to Back',
		description:
			'The fairy sends one or more shapes to the back so that they appear behind everything else.',
	})

export type SendToBackAction = z.infer<typeof SendToBackActionSchema>

export const SharedTodoListActionSchema = z
	.object({
		_type: z.literal('update-todo-list'),
		id: z.number(),
		status: z.enum(['todo', 'in-progress', 'done']),
		text: z.string(),
		claimedById: z.string().optional(),
		x: z.number().optional(),
		y: z.number().optional(),
		// we dont include project id here bc we don't let agents set that manually for now
	})
	.meta({
		title: 'Update shared todo List',
		description: 'The fairy updates a current shared todo list item or creates a new one',
	})

export type SharedTodoListAction = z.infer<typeof SharedTodoListActionSchema>

export const StackActionSchema = z
	.object({
		_type: z.literal('stack'),
		direction: z.enum(['vertical', 'horizontal']),
		gap: z.number(),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Stack',
		description:
			"The fairy stacks shapes horizontally or vertically. Note that this doesn't align shapes, it only stacks them along one axis.",
	})

export type StackAction = z.infer<typeof StackActionSchema>

export const StartProjectActionSchema = z
	.object({
		_type: z.literal('start-project'),
		projectName: z.string(),
		projectDescription: z.string(),
		projectColor: FocusColorSchema,
		projectMemberIds: z.array(z.string()),
	})
	.meta({
		title: 'Start Project',
		description: 'The fairy starts and defines a new project.',
	})

export type StartProjectAction = z.infer<typeof StartProjectActionSchema>

export const ThinkActionSchema = z
	.object({
		_type: z.literal('think'),
		text: z.string(),
	})
	.meta({ title: 'Think', description: 'The fairy describes its intent or reasoning.' })

export type ThinkAction = z.infer<typeof ThinkActionSchema>

export const TodoListActionSchema = z
	.object({
		_type: z.literal('update-todo-list'),
		id: z.number(),
		status: z.enum(['todo', 'in-progress', 'done']),
		text: z.string(),
	})
	.meta({
		title: 'Update Todo List',
		description: 'The fairy updates a current todo list item or creates a new one',
	})

export type TodoListAction = z.infer<typeof TodoListActionSchema>

export const UpdateActionSchema = z
	.object({
		_type: z.literal('update'),
		intent: z.string(),
		update: FocusedShapeSchema,
	})
	.meta({
		title: 'Update',
		description: 'The fairy updates an existing shape.',
	})

export type UpdateAction = z.infer<typeof UpdateActionSchema>

export type UnknownAction = BaseAgentAction<'unknown'>
