import z from 'zod'
import { OtherFairySchema } from '../../format/OtherFairy'
import { PromptPartRegistry } from '../PromptPartRegistry'

export type OtherFairiesPart = z.infer<typeof OtherFairiesPartSchema>
export const OtherFairiesPartSchema = z.object({
	type: z.literal('otherFairies'),
	otherFairies: z.array(OtherFairySchema),
	thisFairy: OtherFairySchema,
})

OtherFairiesPartSchema.register(PromptPartRegistry, {
	priority: 100,
	buildContent({ otherFairies, thisFairy }: OtherFairiesPart) {
		return [
			`You: ${JSON.stringify(thisFairy)}`,
			`Other fairies in this document: ${JSON.stringify(otherFairies)}`,
		]
	},
})
