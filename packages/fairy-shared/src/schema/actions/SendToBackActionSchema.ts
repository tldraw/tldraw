import z from 'zod'

export const SendToBackActionSchema = z
	.object({
		_type: z.literal('send-to-back'),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Send to Back',
		description:
			'The fairy sends one or more shapes to the back so that they appear behind everything else.',
	})

export type SendToBackAction = z.infer<typeof SendToBackActionSchema>
