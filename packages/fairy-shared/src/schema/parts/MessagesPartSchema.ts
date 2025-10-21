import z from 'zod'
import { PromptPartRegistry } from '../PromptPartRegistry'

export type MessagesPart = z.infer<typeof MessagesPartSchema>
export const MessagesPartSchema = z.object({
	type: z.literal('messages'),
	messages: z.array(z.string()),
	requestType: z.enum(['user', 'schedule', 'todo', 'augment-user-prompt']),
})

MessagesPartSchema.register(PromptPartRegistry, {
	priority: Infinity,
	buildContent({ messages, requestType }: MessagesPart) {
		switch (requestType) {
			case 'user':
				return [
					"Using the events provided in the response schema, here's what I want you to do:",
					...messages,
				]
			case 'schedule':
				return [
					"Using the events provided in the response schema, here's what you should do:",
					...messages,
				]
			case 'todo':
				return [
					'There are still outstanding todo items. Please continue. For your reference, the most recent message I gave you was this:',
					...messages,
				]
			case 'augment-user-prompt':
				return [
					'Please craft more detailed instructions to pass onto your computer. Take a swing. Here is what your friend wants you to do.',
					...messages,
				]
				break
		}
	},
})
