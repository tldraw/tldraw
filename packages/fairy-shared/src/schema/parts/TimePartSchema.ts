import z from 'zod'
import { PromptPartRegistry } from '../PromptPartRegistry'

export type TimePart = z.infer<typeof TimePartSchema>
export const TimePartSchema = z.object({
	type: z.literal('time'),
	time: z.string(),
})

TimePartSchema.register(PromptPartRegistry, {
	priority: -100,
	buildContent({ time }: TimePart) {
		return ["The user's current time is:", time]
	},
})
