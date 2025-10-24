import z from 'zod'
import { FocusedShapeSchema } from '../../format/FocusedShape'

export const UpdateActionSchema = z
	.object({
		_type: z.literal('update'),
		intent: z.string(),
		update: FocusedShapeSchema,
	})
	.meta({
		title: 'Update',
		description: 'The fairy updates an existing shape.',
	})

export type UpdateAction = z.infer<typeof UpdateActionSchema>
