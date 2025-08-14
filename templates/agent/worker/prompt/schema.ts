import z from 'zod'
import { EVENT_UTILS } from '../../shared/AgentUtils'

const eventUtils = Object.fromEntries(EVENT_UTILS.map((v) => [v.type, new v()]))
const eventSchemas = EVENT_UTILS.map((v) => {
	const util = eventUtils[v.type]
	if (!util) return null
	const schema = util.getSchema()
	if (!schema) return null
	return schema
}).filter((v) => v !== null)

const eventSchema = z.union(eventSchemas)

export const AgentResponseZodSchema = z.object({
	events: z.array(eventSchema),
})

export const AgentResponseJsonSchema = z.toJSONSchema(AgentResponseZodSchema)
