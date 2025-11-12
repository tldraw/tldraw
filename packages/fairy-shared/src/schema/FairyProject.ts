import z from 'zod'
import { FocusColorSchema } from '../format/FocusColor'

export const FairyProjectSchema = z.object({
	id: z.string(),
	orchestratorId: z.string(),
	name: z.string(),
	description: z.string(),
	color: FocusColorSchema,
	memberIds: z.array(z.string()),
})

export type FairyProject = z.infer<typeof FairyProjectSchema>
