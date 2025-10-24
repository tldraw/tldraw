import z from 'zod'

export const BringToFrontActionSchema = z
	.object({
		_type: z.literal('bring-to-front'),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Bring to Front',
		description:
			'The fairy brings one or more shapes to the front so that they appear in front of everything else.',
	})

export type BringToFrontAction = z.infer<typeof BringToFrontActionSchema>
