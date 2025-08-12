import z from 'zod'
import { AgentEvent } from './AgentEvent'

export const ModelResponse = z.object({
	events: z.array(AgentEvent),
})

export type IModelResponse = z.infer<typeof ModelResponse>

export const RESPONSE_FORMAT = z.toJSONSchema(ModelResponse)
