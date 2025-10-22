import z from 'zod'

export const ImbuePersonalityActionSchema = z
	.object({
		_type: z.literal('imbue-personality'),
		imbuedMessage: z.string(),
	})
	.meta({ title: 'Imbue personality', description: 'The fairy turns the user' })

export type ImbuePersonalityAction = z.infer<typeof ImbuePersonalityActionSchema>
