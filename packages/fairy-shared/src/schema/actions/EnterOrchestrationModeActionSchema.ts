import z from 'zod'

export const EnterOrchestrationModeActionSchema = z
	.object({
		_type: z.literal('enter-orchestration-mode'),
	})
	.meta({
		title: 'Enter Orchestration Mode',
		description: 'The fairy schedules a request to enter orchestration mode.',
	})

export type EnterOrchestrationModeAction = z.infer<typeof EnterOrchestrationModeActionSchema>
