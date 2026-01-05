import z from 'zod'
import { AGENT_ACTION_SCHEMAS } from './AgentActionSchemas'

export function buildResponseSchema() {
	// Use the action schemas directly from shared (no utils needed)
	const actionSchemas = Object.values(AGENT_ACTION_SCHEMAS)

	const actionSchema = z.union(actionSchemas as any)
	const schema = z.object({
		actions: z.array(actionSchema),
	})

	return z.toJSONSchema(schema, { reused: 'ref' })
}
