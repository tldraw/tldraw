import z from 'zod'
import { FocusShapeSchema } from '../../format/FocusShape'

export const UpdateActionSchema = z
	.object({
		_type: z.literal('update'),
		intent: z.string(),
		update: FocusShapeSchema,
	})
	.meta({
		title: 'Update',
		description: 'The fairy updates an existing shape.',
	})

export type UpdateAction = z.infer<typeof UpdateActionSchema>
