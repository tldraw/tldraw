import z from 'zod'
import { FocusColorSchema } from '../format/FocusColor'
import { FocusFillSchema } from '../format/FocusFill'
import { FocusedShapeSchema } from '../format/FocusedShape'
import { BaseAgentAction } from '../types/BaseAgentAction'

export const AlignActionSchema = z
	.object({
		_type: z.literal('align'),
		alignment: z.enum(['top', 'bottom', 'left', 'right', 'center-horizontal', 'center-vertical']),
		gap: z.number(),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({ title: 'Align', description: 'The agent aligns shapes to each other on an axis.' })

export type AlignAction = z.infer<typeof AlignActionSchema>

export const DirectToStartTaskActionSchema = z
	.object({
		_type: z.literal('direct-to-start-project-task'),
		otherFairyId: z.string(),
		taskId: z.number(),
	})
	.meta({
		title: 'Direct to start project task',
		description:
			'The agent directs another agent to start working on a specific task within the current project. Only do this once the task is ready to be started.',
	})

export type DirectToStartTaskAction = z.infer<typeof DirectToStartTaskActionSchema>

export const BringToFrontActionSchema = z
	.object({
		_type: z.literal('bring-to-front'),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Bring to Front',
		description:
			'The agent brings one or more shapes to the front so that they appear in front of everything else.',
	})

export type BringToFrontAction = z.infer<typeof BringToFrontActionSchema>

export const ClaimTodoItemActionSchema = z
	.object({
		_type: z.literal('claim-todo-item'),
		todoItemId: z.number(),
	})
	.meta({
		title: 'Claim todo item',
		description: 'The agent claims a task for themselves.',
	})

export type ClaimTodoItemAction = z.infer<typeof ClaimTodoItemActionSchema>

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
			'The agent gets information about a country by providing its country code, eg: "de" for Germany.',
	})

export type CountryInfoAction = z.infer<typeof CountryInfoActionSchema>

export const CreateActionSchema = z
	.object({
		_type: z.literal('create'),
		intent: z.string(),
		shape: FocusedShapeSchema,
	})
	.meta({ title: 'Create', description: 'The agent creates a new shape.' })

export type CreateAction = z.infer<typeof CreateActionSchema>

export const DeleteActionSchema = z
	.object({
		_type: z.literal('delete'),
		intent: z.string(),
		shapeId: z.string(),
	})
	.meta({ title: 'Delete', description: 'The agent deletes a shape.' })

export type DeleteAction = z.infer<typeof DeleteActionSchema>

export const ActivateFairyActionSchema = z
	.object({
		_type: z.literal('activate-agent'),
		fairyId: z.string(),
	})
	.meta({
		title: 'Activate agent',
		description: 'The agent activates a agent so that it can start to work on its assigned tasks.',
	})

export type ActivateFairyAction = z.infer<typeof ActivateFairyActionSchema>

export const DistributeActionSchema = z
	.object({
		_type: z.literal('distribute'),
		direction: z.enum(['horizontal', 'vertical']),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Distribute',
		description: 'The agent distributes shapes horizontally or vertically.',
	})

export type DistributeAction = z.infer<typeof DistributeActionSchema>

export const EndCurrentProjectActionSchema = z
	.object({
		_type: z.literal('end-project'),
	})
	.meta({
		title: 'End Current Project',
		description: 'The agent ends the currently active project once all tasks are complete.',
	})

export type EndCurrentProjectAction = z.infer<typeof EndCurrentProjectActionSchema>

export const EnterOrchestrationModeActionSchema = z
	.object({
		_type: z.literal('enter-orchestration-mode'),
	})
	.meta({
		title: 'Enter Orchestration Mode',
		description: 'The agent schedules a request to enter orchestration mode.',
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
			'The agent flies to the specified bounds of the canvas to navigate to other areas of the canvas if needed.',
	})

export type FlyToBoundsAction = z.infer<typeof FlyToBoundsActionSchema>

export const LabelActionSchema = z
	.object({
		_type: z.literal('label'),
		intent: z.string(),
		shapeId: z.string(),
		text: z.string(),
	})
	.meta({ title: 'Label', description: "The agent changes a shape's text." })

export type LabelAction = z.infer<typeof LabelActionSchema>

export const MessageActionSchema = z
	.object({
		_type: z.literal('message'),
		text: z.string(),
	})
	.meta({ title: 'Message', description: 'The agent sends a message to the user.' })

export type MessageAction = z.infer<typeof MessageActionSchema>

export const MoveActionSchema = z
	.object({
		_type: z.literal('move'),
		intent: z.string(),
		shapeId: z.string(),
		x: z.number(),
		y: z.number(),
	})
	.meta({ title: 'Move', description: 'The agent moves a shape to a new position.' })

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
			'The agent draws a freeform line with a pen. This is useful for drawing custom paths that are not available with the other available shapes. The "smooth" style will automatically smooth the line between points. The "straight" style will render a straight line between points. The "closed" property will determine if the drawn line gets automatically closed to form a complete shape or not. Remember that the pen will be *down* until the action is over. If you want to lift up the pen, start a new pen action.',
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
	.meta({ title: 'Place', description: 'The agent places a shape relative to another shape.' })

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
			'The agent resizes one or more shapes, with the resize operation being performed relative to an origin point.',
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
			'The agent schedules further work or a review so that it can look at the results of its work so far and take further action, such as reviewing what it has done or taking further steps that would benefit from seeing the results of its work so far.',
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
		description: 'The agent rotates one or more shapes around an origin point.',
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
			'The agent sends one or more shapes to the back so that they appear behind everything else.',
	})

export type SendToBackAction = z.infer<typeof SendToBackActionSchema>

export const SharedTodoListActionSchema = z
	.object({
		_type: z.literal('update-shared-todo-list'),
		id: z.number(),
		status: z.enum(['todo', 'in-progress', 'done']),
		text: z.string(),
		x: z.number().optional(),
		y: z.number().optional(),
	})
	.meta({
		title: 'Update shared todo List',
		description: 'The agent updates a current shared todo list item or creates a new one',
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
			"The agent stacks shapes horizontally or vertically. Note that this doesn't align shapes, it only stacks them along one axis.",
	})

export type StackAction = z.infer<typeof StackActionSchema>

export const StartProjectActionSchema = z
	.object({
		_type: z.literal('start-project'),
		projectName: z.string(),
		projectDescription: z.string(),
		projectColor: FocusColorSchema,
		projectPlan: z.string(),
	})
	.meta({
		title: 'Start Project',
		description: 'The agent starts and defines a new project.',
	})

export type StartProjectAction = z.infer<typeof StartProjectActionSchema>

export const ThinkActionSchema = z
	.object({
		_type: z.literal('think'),
		text: z.string(),
	})
	.meta({ title: 'Think', description: 'The agent describes its intent or reasoning.' })

export type ThinkAction = z.infer<typeof ThinkActionSchema>

export const PersonalTodoListActionSchema = z
	.object({
		_type: z.literal('update-personal-todo-list'),
		id: z.number().optional(),
		status: z.enum(['todo', 'in-progress', 'done']),
		text: z.string(),
	})
	.meta({
		title: 'Update Personal Todo List',
		description:
			'The agent updates its personal todo list item or creates a new todo item. If the id is provided, the todo item is updated. If the id is not provided, a new todo item is created.',
	})

export type PersonalTodoListAction = z.infer<typeof PersonalTodoListActionSchema>

export const UpdateActionSchema = z
	.object({
		_type: z.literal('update'),
		intent: z.string(),
		update: FocusedShapeSchema,
	})
	.meta({
		title: 'Update',
		description: 'The agent updates an existing shape.',
	})

export type UpdateAction = z.infer<typeof UpdateActionSchema>

export const ChangePageActionSchema = z
	.object({
		_type: z.literal('change-page'),
		pageName: z.string(),
		intent: z.string(),
	})
	.meta({
		title: 'Change Page',
		description:
			'The agent changes to a different page by name. Use this to navigate between existing pages.',
	})

export type ChangePageAction = z.infer<typeof ChangePageActionSchema>

export const CreatePageActionSchema = z
	.object({
		_type: z.literal('create-page'),
		pageName: z.string(),
		intent: z.string(),
		switchToPage: z.boolean(),
	})
	.meta({
		title: 'Create Page',
		description:
			'The agent creates a new page with the specified name. If switchToPage is true, the agent will also navigate to the newly created page.',
	})

export type CreatePageAction = z.infer<typeof CreatePageActionSchema>

export const CreateSoloTaskActionSchema = z
	.object({
		_type: z.literal('create-task'),
		text: z.string(),
		x: z.number(),
		y: z.number(),
		w: z.number(),
		h: z.number(),
	})
	.meta({
		title: 'Create Task',
		description:
			"The agent describes one new task that they'd like to do at some point in the future, as well as the area in which it should be done. Each task should represent one step in the longer process. It's okay to create many tasks. Note: Creating a task does not automatically start it. You must use the 'start-task' action to start a task. This is to allow you to create multiple tasks ahead of time, and then pick one to start with. Also note: Tasks get an automatic ID that's used to reference them. They start at 1, and then increment by 1 for each new task.",
	})

export type CreateTaskAction = z.infer<typeof CreateSoloTaskActionSchema>

export const CreateProjectTaskActionSchema = z
	.object({
		_type: z.literal('create-project-task'),
		text: z.string(),
		assignedTo: z.string(),
		x: z.number(),
		y: z.number(),
		w: z.number(),
		h: z.number(),
	})
	.meta({
		title: 'Create Project Task',
		description:
			"The agent creates a new task within the current project and assigns it to a specific agent. The task will automatically be associated with the current project. Each task should represent one step in the longer process. It's okay to create many tasks. Note: Creating a task and assigning it to another agent does not automatically start it. You must use the 'direct-to-start-project-task' action to get another agent to start a task. Also note: Tasks get an automatic ID that's used to reference them. They start at 1, and then increment by 1 for each new task.",
	})

export type CreateProjectTaskAction = z.infer<typeof CreateProjectTaskActionSchema>

export const StartSoloTaskActionSchema = z
	.object({
		_type: z.literal('start-task'),
		taskId: z.number(),
	})
	.meta({
		title: 'Start Task',
		description:
			'The agent begins working on a task. This action immediately gives the agent the abilities required to complete the task, such as the ability to manipulate the canvas. Upon performing this action, the agent will immediately receive instructions on how to use those abilities.',
	})

export type StartSoloTaskAction = z.infer<typeof StartSoloTaskActionSchema>

export const MarkDroneTaskDoneActionSchema = z
	.object({
		_type: z.literal('mark-my-task-done'),
		taskId: z.number(),
	})
	.meta({
		title: 'Mark Task Done',
		description:
			'The agent marks a task as completed. This action should be used when the agent has finished working on a task.',
	})

export type MarkDroneTaskDoneAction = z.infer<typeof MarkDroneTaskDoneActionSchema>

export const MarkSoloTaskDoneActionSchema = z
	.object({
		_type: z.literal('mark-task-done'),
		taskId: z.number(),
	})
	.meta({
		title: 'Mark Task Done',
		description:
			'The agent marks a task as completed. This action should be used when the agent has finished working on a task.',
	})

export type MarkSoloTaskDoneAction = z.infer<typeof MarkSoloTaskDoneActionSchema>

export const AwaitTasksCompletionActionSchema = z
	.object({
		_type: z.literal('await-tasks-completion'),
		taskIds: z.array(z.number()),
	})
	.meta({
		title: 'Await Tasks Completion',
		description:
			'The agent waits for one or more tasks to be completed. The agent will be notified when each task completes, allowing it to pause its work instead of repeatedly checking task status.',
	})

export type AwaitTasksCompletionAction = z.infer<typeof AwaitTasksCompletionActionSchema>

export const SleepActionSchema = z
	.object({
		_type: z.literal('sleep'),
	})
	.meta({
		title: 'Sleep',
		description: 'The agent goes back to idle mode, stopping its current work.',
	})

export type SleepAction = z.infer<typeof SleepActionSchema>

export type UnknownAction = BaseAgentAction<'unknown'>
