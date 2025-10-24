import z from 'zod'

export const DistributeActionSchema = z
	.object({
		_type: z.literal('distribute'),
		direction: z.enum(['horizontal', 'vertical']),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Distribute',
		description: 'The fairy distributes shapes horizontally or vertically.',
	})

export type DistributeAction = z.infer<typeof DistributeActionSchema>
