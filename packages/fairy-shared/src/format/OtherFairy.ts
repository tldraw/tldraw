import z from 'zod'

export const VecModelSchema = z.object({
	x: z.number(),
	y: z.number(),
})

export const OtherFairySchema = z.object({
	name: z.string(),
	position: VecModelSchema,
})

export type OtherFairy = z.infer<typeof OtherFairySchema>
