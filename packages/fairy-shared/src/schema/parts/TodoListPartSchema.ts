import z from 'zod'
import { TodoItemSchema } from '../../types/TodoItem'

export type TodoListPart = z.infer<typeof TodoListPartSchema>
export const TodoListPartSchema = z
	.object({
		type: z.literal('todoList'),
		items: z.array(TodoItemSchema),
	})
	.meta({
		priority: -10,
	})
