import z from 'zod'
import { OtherFairySchema } from '../../format/OtherFairy'
import { PromptPartRegistry } from '../PromptPartRegistry'

export type OtherFairiesPart = z.infer<typeof OtherFairiesPartSchema>
export const OtherFairiesPartSchema = z.object({
	type: z.literal('otherFairies'),
	nearbyFairies: z.array(OtherFairySchema),
	distantFairies: z.array(OtherFairySchema),
	thisFairy: OtherFairySchema,
})

OtherFairiesPartSchema.register(PromptPartRegistry, {
	priority: 100,
	buildContent({ nearbyFairies, distantFairies, thisFairy }: OtherFairiesPart) {
		const messages = [`You: ${JSON.stringify(thisFairy)}`]

		if (nearbyFairies.length > 0) {
			messages.push(`Fairies within shouting distance: ${JSON.stringify(nearbyFairies)}`)
		}

		if (distantFairies.length > 0) {
			messages.push(`Fairies beyond shouting distance: ${JSON.stringify(distantFairies)}`)
		}

		return messages
	},
})
