import z from 'zod'

export const LabelActionSchema = z
	.object({
		_type: z.literal('label'),
		intent: z.string(),
		shapeId: z.string(),
		text: z.string(),
	})
	.meta({ title: 'Label', description: "The fairy changes a shape's text." })

export type LabelAction = z.infer<typeof LabelActionSchema>
