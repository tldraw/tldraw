import z from 'zod'
import { getAgentActionUtilsRecord } from '../../shared/AgentUtils'

export function buildResponseZodSchema() {
	const actionUtils = getAgentActionUtilsRecord()
	const actionSchemas = Object.values(actionUtils)
		.map((util) => util.getSchema())
		.filter((schema) => schema !== null)

	const actionSchema = z.union(actionSchemas)

	return z.object({
		actions: z.array(actionSchema),
	})
}
