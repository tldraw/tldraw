import z from 'zod'

export const AlignActionSchema = z
	.object({
		_type: z.literal('align'),
		alignment: z.enum(['top', 'bottom', 'left', 'right', 'center-horizontal', 'center-vertical']),
		gap: z.number(),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({ title: 'Align', description: 'The fairy aligns shapes to each other on an axis.' })

export type AlignAction = z.infer<typeof AlignActionSchema>
