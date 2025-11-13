import z from 'zod'
import { FocusedShapeSchema } from '../../format/FocusedShape'
import { PromptPartRegistry } from '../PromptPartRegistry'

export type SelectedShapesPart = z.infer<typeof SelectedShapesPartSchema>
export const SelectedShapesPartSchema = z.object({
	type: z.literal('selectedShapes'),
	shapes: z.array(FocusedShapeSchema).nullable(),
})

SelectedShapesPartSchema.register(PromptPartRegistry, {
	priority: -55,
	buildContent({ shapes }: SelectedShapesPart) {
		if (!shapes || shapes.length === 0) {
			return []
		}
		return [
			'The user has selected these shapes. Focus your task on these shapes where applicable:',
			JSON.stringify(shapes),
		]
	},
})
