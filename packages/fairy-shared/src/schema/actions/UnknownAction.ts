import z from 'zod'
import { BaseAgentAction } from '../../types/BaseAgentAction'

export type UnknownAction = BaseAgentAction<'unknown'>
export const UnknownActionSchema = z.object({
	type: z.literal('unknown'),
})
