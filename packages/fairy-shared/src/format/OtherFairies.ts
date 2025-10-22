import z from 'zod'

export const VecModelSchema = z.object({
	x: z.number(),
	y: z.number(),
})

export const OtherFairiesSchema = z.object({
	name: z.string(),
	position: VecModelSchema,
})

export type OtherFairies = z.infer<typeof OtherFairiesSchema>
