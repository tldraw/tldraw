import z from 'zod'

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
