import z from 'zod'

export const SharedTodoItemSchema = z.object({
	id: z.number(),
	text: z.string(),
	status: z.enum(['todo', 'in-progress', 'done']),
	claimedById: z.string().optional(),
	x: z.number().optional(),
	y: z.number().optional(),
})

export type SharedTodoItem = z.infer<typeof SharedTodoItemSchema>
