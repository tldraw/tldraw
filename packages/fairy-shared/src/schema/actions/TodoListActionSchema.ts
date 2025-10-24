import z from 'zod'

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
