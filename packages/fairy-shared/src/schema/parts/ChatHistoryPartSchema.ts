import z from 'zod'
import { PromptPartRegistry } from '../PromptPartRegistry'

export type ChatHistoryPart = z.infer<typeof ChatHistoryPartSchema>
export const ChatHistoryPartSchema = z.object({
	type: z.literal('chatHistory'),
	// Todo
	items: z.array(z.any()).nullable(),
})

ChatHistoryPartSchema.register(PromptPartRegistry, {
	priority: -Infinity,
	buildContent(_part: ChatHistoryPart) {
		return ['TODO']
	},
})
