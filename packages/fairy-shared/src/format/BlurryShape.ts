import z from 'zod'
import { SimpleShapeIdSchema } from '../schema/id-schemas'
import { FocusedShapeTypeSchema } from './FocusedShape'

export const BlurryShapeSchema = z.object({
	shapeId: SimpleShapeIdSchema,
	text: z.string().optional(),
	type: FocusedShapeTypeSchema,
	x: z.number(),
	y: z.number(),
	w: z.number(),
	h: z.number(),
})

export type BlurryShape = z.infer<typeof BlurryShapeSchema>
