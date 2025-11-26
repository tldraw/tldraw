import z from 'zod'
import { BoxModelSchema } from './PeripheralCluster'

export const VecModelSchema = z.object({
	x: z.number(),
	y: z.number(),
})

export const OtherFairySchema = z.object({
	id: z.string(),
	name: z.string(),
	position: VecModelSchema,
	isGenerating: z.boolean(),
	bounds: BoxModelSchema.nullable(),
	// personality: z.string(),
	currentProjectId: z.string().nullable(),
})

export type OtherFairy = z.infer<typeof OtherFairySchema>
