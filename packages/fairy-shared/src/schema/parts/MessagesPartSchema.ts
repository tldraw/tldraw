import z from 'zod'
import { PromptPartRegistry } from '../PromptPartRegistry'

export type MessagesPart = z.infer<typeof MessagesPartSchema>
export const MessagesPartSchema = z.object({
	type: z.literal('messages'),
	messages: z.array(z.string()),
	requestType: z.enum(['user', 'schedule', 'todo']),
})

MessagesPartSchema.register(PromptPartRegistry, {
	priority: Infinity,
	buildContent({ messages, requestType }: MessagesPart) {
		switch (requestType) {
			case 'user':
				return ['User message', ...messages]
			case 'schedule':
				return [...messages]
			case 'todo':
				return [
					'There are still outstanding todo items. Please continue. For your reference, the most recent message I gave you was this:',
					...messages,
				]
		}
	},
})
