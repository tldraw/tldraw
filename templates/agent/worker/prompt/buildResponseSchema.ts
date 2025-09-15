import z from 'zod'
import { getAgentActionUtilsRecord } from '../../shared/AgentUtils'

export function buildResponseSchema() {
	const actionUtils = getAgentActionUtilsRecord()
	const actionSchemas = Object.values(actionUtils)
		.map((util) => util.getSchema())
		.filter((schema) => schema !== null)

	const actionSchema = z.union(actionSchemas)
	const schema = z.object({
		actions: z.array(actionSchema),
	})

	return z.toJSONSchema(schema, { reused: 'ref' })
}
