import z from 'zod'

export const BoxModelSchema = z.object({
	x: z.number(),
	y: z.number(),
	w: z.number(),
	h: z.number(),
})

export const PeripheralClusterSchema = z.object({
	bounds: BoxModelSchema,
	numberOfShapes: z.number(),
})

export type PeripheralCluster = z.infer<typeof PeripheralClusterSchema>
