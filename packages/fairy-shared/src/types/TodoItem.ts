import z from 'zod'

export const TodoItemSchema = z.object({
	id: z.number(),
	text: z.string(),
	status: z.enum(['todo', 'in-progress', 'done']),
})

export type TodoItem = z.infer<typeof TodoItemSchema>
