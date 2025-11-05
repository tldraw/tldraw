import z from 'zod'
import { FocusColorSchema } from '../../format/FocusColor'

export const StartProjectActionSchema = z
	.object({
		_type: z.literal('start-project'),
		projectName: z.string(),
		projectDescription: z.string(),
		projectColor: FocusColorSchema,
		projectMemberIds: z.array(z.string()),
	})
	.meta({
		title: 'Start Project',
		description: 'The fairy starts and defines a new project.',
	})

export type StartProjectAction = z.infer<typeof StartProjectActionSchema>
