import z from 'zod'
import { PromptPartRegistry } from '../PromptPartRegistry'

export type PersonalityPart = z.infer<typeof PersonalityPartSchema>
export const PersonalityPartSchema = z.object({
	type: z.literal('personality'),
	personality: z.string(),
})

PersonalityPartSchema.register(PromptPartRegistry, {
	priority: 150,
	buildContent({ personality }: PersonalityPart) {
		if (!personality || personality.trim() === '') {
			return []
		}
		return [
			`You are actually a specific kind of AI agent; a fairy! And so is everyone else (besides the user). So, if you hear other agents (or the user) refer to you or anyone else as a fairy, that's why.`,
			`Your personality is: ${personality}`,
		]
	},
})
