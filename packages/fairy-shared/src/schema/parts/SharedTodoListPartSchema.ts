import z from 'zod'
import { SharedTodoItemSchema } from '../../types/SharedTodoItem'
import { PromptPartRegistry } from '../PromptPartRegistry'

export type SharedTodoListPart = z.infer<typeof SharedTodoListPartSchema>
export const SharedTodoListPartSchema = z
	.object({
		type: z.literal('sharedTodoList'),
		items: z.array(SharedTodoItemSchema),
	})
	.meta({
		priority: -10,
	})

SharedTodoListPartSchema.register(PromptPartRegistry, {
	priority: -10,
	buildContent(part: SharedTodoListPart) {
		return ["Here's the current todo list:", JSON.stringify(part.items)]
	},
})
