import z from 'zod'

export const FlyToBoundsActionSchema = z
	.object({
		_type: z.literal('fly-to-bounds'),
		intent: z.string(),
		x: z.number(),
		y: z.number(),
		w: z.number(),
		h: z.number(),
	})
	.meta({
		title: 'Fly To Bounds',
		description:
			'The fairy flies to the specified bounds of the canvas to navigate to other areas of the canvas if needed.',
	})

export type FlyToBoundsAction = z.infer<typeof FlyToBoundsActionSchema>
