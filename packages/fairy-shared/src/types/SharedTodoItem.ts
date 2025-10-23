import z from 'zod'

export const SharedTodoItemSchema = z.object({
	id: z.number(),
	text: z.string(),
	status: z.enum(['todo', 'in-progress', 'done']),
	claimedBy: z.string(),
})

export type SharedTodoItem = z.infer<typeof SharedTodoItemSchema>
