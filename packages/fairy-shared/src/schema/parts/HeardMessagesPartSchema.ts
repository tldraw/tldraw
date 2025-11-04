import z from 'zod'
import { PromptPartRegistry } from '../PromptPartRegistry'

export type HeardMessagesPart = z.infer<typeof HeardMessagesPartSchema>
export const HeardMessagesPartSchema = z.object({
	type: z.literal('heardMessages'),
	heardMessages: z.array(
		z.object({
			senderId: z.string(),
			senderName: z.string(),
			message: z.string(),
			timestamp: z.number(),
			response_requested: z.boolean(),
		})
	),
})

HeardMessagesPartSchema.register(PromptPartRegistry, {
	priority: 0,
	buildContent({ heardMessages }: HeardMessagesPart) {
		if (heardMessages.length === 0) {
			return []
		}

		const lines = ['## Recent proximity chat messages you have heard:']
		for (const msg of heardMessages) {
			const responseIndicator = msg.response_requested ? ' (response requested)' : ''
			lines.push(`[${msg.senderName} (${msg.senderId})]: ${msg.message}${responseIndicator}`)
		}

		return lines
	},
})
