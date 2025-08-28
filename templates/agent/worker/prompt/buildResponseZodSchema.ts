import z from 'zod'
import { AGENT_ACTION_UTILS } from '../../shared/AgentUtils'

export function buildResponseZodSchema() {
	const eventUtils = Object.fromEntries(AGENT_ACTION_UTILS.map((v) => [v.type, new v()]))
	const eventSchemas = AGENT_ACTION_UTILS.map((v) => {
		const util = eventUtils[v.type]
		if (!util) return null
		const schema = util.getSchema()
		if (!schema) return null
		return schema
	}).filter((v) => v !== null)

	const eventSchema = z.union(eventSchemas)

	return z.object({
		events: z.array(eventSchema),
	})
}
