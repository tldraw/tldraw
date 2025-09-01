import z from 'zod'
import { buildResponseZodSchema } from './buildResponseZodSchema'

export function buildResponseJsonSchema() {
	return z.toJSONSchema(buildResponseZodSchema(), { reused: 'ref' })
}
