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
		return [`Your personality: ${personality}`]
	},
})
