import z from 'zod'

export const MessageActionSchema = z
	.object({
		_type: z.literal('message'),
		text: z.string(),
	})
	.meta({ title: 'Message', description: 'The fairy sends a message to the user.' })

export type MessageAction = z.infer<typeof MessageActionSchema>
