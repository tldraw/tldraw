import z from 'zod'
import { FocusedShapeSchema } from '../../format/FocusedShape'

export const CreateActionSchema = z
	.object({
		_type: z.literal('create'),
		intent: z.string(),
		shape: FocusedShapeSchema,
	})
	.meta({ title: 'Create', description: 'The fairy creates a new shape.' })

export type CreateAction = z.infer<typeof CreateActionSchema>
