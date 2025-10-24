import z from 'zod'
import { BlurryShapeSchema } from '../../format/BlurryShape'

export type BlurryShapesPart = z.infer<typeof BlurryShapesPartSchema>
export const BlurryShapesPartSchema = z.object({
	type: z.literal('blurryShapes'),
	shapes: z.array(BlurryShapeSchema),
})
