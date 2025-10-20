import z from 'zod'
import { AgentAction } from '../types/AgentAction'
import { AGENT_ACTION_SCHEMAS } from './FairySchema'

/**
 * Build the JSON schema for the agent's response format.
 */
export function buildResponseSchema(_availableActionTypes: AgentAction['_type'][]) {
	// Todo: Filter the available action schemas to only include the available action types.
	const availableActionSchemas = AGENT_ACTION_SCHEMAS

	const schema = z.object({
		actions: z.array(z.union(availableActionSchemas)),
	})

	return z.toJSONSchema(schema, { reused: 'ref' })
}
