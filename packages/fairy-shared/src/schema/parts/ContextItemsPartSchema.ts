import z from 'zod'
import { PromptPartRegistry } from '../PromptPartRegistry'

export type ContextItemsPart = z.infer<typeof ContextItemsPartSchema>
export const ContextItemsPartSchema = z.object({
	type: z.literal('contextItems'),
	// Todo
	items: z.array(z.any()),
	requestType: z.enum(['user', 'schedule', 'todo']),
})

ContextItemsPartSchema.register(PromptPartRegistry, {
	priority: -60,
	buildContent(_part: ContextItemsPart) {
		return ['TODO']
	},
})
