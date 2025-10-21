import z from 'zod'
import { FocusShapeSchema } from '../../format/FocusShape'

export const CreateActionSchema = z
	.object({
		_type: z.literal('create'),
		intent: z.string(),
		shape: FocusShapeSchema,
	})
	.meta({ title: 'Create', description: 'The fairy creates a new shape.' })

export type CreateAction = z.infer<typeof CreateActionSchema>
