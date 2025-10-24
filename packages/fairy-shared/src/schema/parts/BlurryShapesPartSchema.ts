import z from 'zod'
import { BlurryShapeSchema } from '../../format/BlurryShape'
import { PromptPartRegistry } from '../PromptPartRegistry'

export type BlurryShapesPart = z.infer<typeof BlurryShapesPartSchema>
export const BlurryShapesPartSchema = z.object({
	type: z.literal('blurryShapes'),
	shapes: z.array(BlurryShapeSchema),
})

BlurryShapesPartSchema.register(PromptPartRegistry, {
	priority: -70,
	buildContent(part: BlurryShapesPart) {
		const { shapes } = part
		if (!shapes || shapes.length === 0) {
			return ['There are no shapes in your view at the moment.']
		}

		return [`These are the shapes you can currently see:`, JSON.stringify(shapes)]
	},
})
