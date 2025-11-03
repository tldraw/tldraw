import z from 'zod'

export const ChatActionSchema = z
	.object({
		_type: z.literal('proximity-chat'),
		text: z.string(),
	})
	.meta({
		title: 'Chat',
		description: 'The fairy sends a chat message to nearby fairies, @-mentioning them if desired.',
	})

export type ChatAction = z.infer<typeof ChatActionSchema>
