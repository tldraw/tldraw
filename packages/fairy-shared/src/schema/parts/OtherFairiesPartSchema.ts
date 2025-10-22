import z from 'zod'
import { OtherFairiesSchema } from '../../format/OtherFairies'
import { PromptPartRegistry } from '../PromptPartRegistry'

export type OtherFairiesPart = z.infer<typeof OtherFairiesPartSchema>
export const OtherFairiesPartSchema = z.object({
	type: z.literal('otherFairies'),
	otherFairies: z.array(OtherFairiesSchema),
})

OtherFairiesPartSchema.register(PromptPartRegistry, {
	priority: 100,
	buildContent({ otherFairies }: OtherFairiesPart) {
		if (otherFairies.length === 0) return ['You are the only fairy working at the moment.']
		if (otherFairies.length === 1) {
			const otherFairyName = otherFairies[0].name
			const otherFairyX = otherFairies[0].position.x
			const otherFairyY = otherFairies[0].position.y
			return [
				`There is one other fairy working at the moment: ${otherFairyName} is at (${otherFairyX}, ${otherFairyY}).`,
			]
		}
		const multipleFairiesContent = otherFairies.map((otherFairy) => {
			const otherFairyName = otherFairy.name
			const otherFairyX = otherFairy.position.x
			const otherFairyY = otherFairy.position.y
			return `${otherFairyName} is at (${otherFairyX}, ${otherFairyY}).`
		})
		return [
			`There are ${otherFairies.length} other fairies working at the moment.`,
			...multipleFairiesContent,
		]
	},
})
