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
		const content: string[] = [
			`You are ${thisFairy.name} and you are at (${thisFairy.position.x}, ${thisFairy.position.y}).`,
		]

		if (otherFairies.length === 0) content.push('You are the only fairy working at the moment.')
		if (otherFairies.length === 1) {
			const otherFairyName = otherFairies[0].name
			const otherFairyX = otherFairies[0].position.x
			const otherFairyY = otherFairies[0].position.y
			content.push(
				`There is one other fairy working at the moment: ${otherFairyName} is at (${otherFairyX}, ${otherFairyY}).`
			)
		}
		if (otherFairies.length > 1) {
			content.push(`There are ${otherFairies.length} other fairies working at the moment.`)
			otherFairies.forEach((otherFairy) => {
				const otherFairyName = otherFairy.name
				const otherFairyX = otherFairy.position.x
				const otherFairyY = otherFairy.position.y
				content.push(`${otherFairyName} is at (${otherFairyX}, ${otherFairyY}).`)
			})
		}

		return content
	},
})
