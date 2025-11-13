import z from 'zod'

export const EndCurrentProjectActionSchema = z
	.object({
		_type: z.literal('end-current-project'),
	})
	.meta({
		title: 'End Current Project',
		description: 'The fairy ends the currently active project.',
	})

export type EndCurrentProjectAction = z.infer<typeof EndCurrentProjectActionSchema>
