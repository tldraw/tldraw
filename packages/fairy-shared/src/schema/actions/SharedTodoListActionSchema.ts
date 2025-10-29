import z from 'zod'

export const SharedTodoListActionSchema = z
	.object({
		_type: z.literal('update-todo-list'),
		id: z.number(),
		status: z.enum(['todo', 'in-progress', 'done']),
		text: z.string(),
		claimedBy: z
			.object({
				id: z.string(),
				name: z.string(),
			})
			.nullable(),
	})
	.meta({
		title: 'Update shared todo List',
		description: 'The fairy updates a current shared todo list item or creates a new one',
	})

export type SharedTodoListAction = z.infer<typeof SharedTodoListActionSchema>
