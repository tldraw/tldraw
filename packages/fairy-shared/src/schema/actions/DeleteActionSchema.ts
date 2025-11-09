import z from 'zod'

export const DeleteActionSchema = z
	.object({
		_type: z.literal('delete'),
		intent: z.string(),
		shapeId: z.string(),
	})
	.meta({ title: 'Delete', description: 'The fairy deletes a shape.' })

export type DeleteAction = z.infer<typeof DeleteActionSchema>
