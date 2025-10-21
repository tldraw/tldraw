import z from 'zod'
import { AgentAction } from '../types/AgentAction'
import { AGENT_ACTION_SCHEMAS } from './FairySchema'

/**
 * Build the JSON schema for the agent's response format.
 */
export function buildResponseSchema(availableActionTypes: AgentAction['_type'][]) {
	const availableActionSchemas = AGENT_ACTION_SCHEMAS.filter((schema) =>
		availableActionTypes.includes(schema.shape._type.value)
	)

	const schema = z.object({
		actions: z.array(z.union(availableActionSchemas)),
	})

	return z.toJSONSchema(schema, { reused: 'ref' })
}
