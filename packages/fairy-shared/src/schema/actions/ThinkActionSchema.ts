import z from 'zod'

export const ThinkActionSchema = z
	.object({
		_type: z.literal('think'),
		text: z.string(),
	})
	.meta({ title: 'Think', description: 'The fairy describes its intent or reasoning.' })

export type ThinkAction = z.infer<typeof ThinkActionSchema>
