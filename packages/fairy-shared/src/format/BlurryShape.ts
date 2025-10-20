import z from 'zod'
import { FocusShapeTypeSchema } from '../schema/FocusShapeSchema'

export const BlurryShapeSchema = z.object({
	shapeId: z.string(),
	text: z.string().optional(),
	type: FocusShapeTypeSchema,
	x: z.number(),
	y: z.number(),
	w: z.number(),
	h: z.number(),
})

export type BlurryShape = z.infer<typeof BlurryShapeSchema>
