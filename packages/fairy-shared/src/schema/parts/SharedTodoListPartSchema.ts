import z from 'zod'
import { SharedTodoItemSchema } from '../../types/SharedTodoItem'

export type SharedTodoListPart = z.infer<typeof SharedTodoListPartSchema>
export const SharedTodoListPartSchema = z
	.object({
		type: z.literal('sharedTodoList'),
		items: z.array(SharedTodoItemSchema),
	})
	.meta({
		priority: -10,
	})
