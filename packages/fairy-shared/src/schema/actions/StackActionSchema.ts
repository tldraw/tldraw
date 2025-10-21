import z from 'zod'

export const StackActionSchema = z
	.object({
		_type: z.literal('stack'),
		direction: z.enum(['vertical', 'horizontal']),
		gap: z.number(),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Stack',
		description:
			"The fairy stacks shapes horizontally or vertically. Note that this doesn't align shapes, it only stacks them along one axis.",
	})

export type StackAction = z.infer<typeof StackActionSchema>
