import z from 'zod'
import { AgentAction, getActionSchema } from '../types/AgentAction'

export function buildResponseSchema(actionTypes: AgentAction['_type'][]) {
	const actionSchemas = actionTypes
		.map((type) => getActionSchema(type))
		.filter((schema) => schema !== undefined)

	if (actionSchemas.length === 0) {
		throw new Error('No action schemas found for the provided action types')
	}

	const actionSchema = z.union(actionSchemas)
	const schema = z.object({
		actions: z.array(actionSchema),
	})

	return z.toJSONSchema(schema, { reused: 'ref' })
}
