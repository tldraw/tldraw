import z from 'zod'

export const RotateActionSchema = z
	.object({
		_type: z.literal('rotate'),
		centerY: z.number(),
		degrees: z.number(),
		intent: z.string(),
		originX: z.number(),
		originY: z.number(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Rotate',
		description: 'The fairy rotates one or more shapes around an origin point.',
	})

export type RotateAction = z.infer<typeof RotateActionSchema>
