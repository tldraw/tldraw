import z from 'zod'

export const FairyTaskSchema = z.object({
	id: z.number(),
	text: z.string(),
	status: z.enum(['todo', 'in-progress', 'done']),
	assignedById: z.string().optional(),
	x: z.number().optional(),
	y: z.number().optional(),
	projectId: z.string().optional(),
})

export type FairyTask = z.infer<typeof FairyTaskSchema>
