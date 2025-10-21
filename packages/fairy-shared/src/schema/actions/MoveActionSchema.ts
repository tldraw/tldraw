import z from 'zod'

export const MoveActionSchema = z
	.object({
		_type: z.literal('move'),
		intent: z.string(),
		shapeId: z.string(),
		x: z.number(),
		y: z.number(),
	})
	.meta({ title: 'Move', description: 'The fairy moves a shape to a new position.' })

export type MoveAction = z.infer<typeof MoveActionSchema>
