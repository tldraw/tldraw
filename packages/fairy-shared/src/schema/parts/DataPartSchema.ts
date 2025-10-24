import { JsonValue } from 'tldraw'
import z from 'zod'
import { PromptPartRegistry } from '../PromptPartRegistry'

const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
	z.union([
		z.union([z.boolean(), z.null(), z.string(), z.number()]),
		z.array(JsonValueSchema),
		z.record(z.string(), JsonValueSchema.optional()),
	])
)

export type DataPart = z.infer<typeof DataPartSchema>
export const DataPartSchema = z.object({
	type: z.literal('data'),
	data: z.array(JsonValueSchema),
})

DataPartSchema.register(PromptPartRegistry, {
	priority: 200,
	buildContent({ data }: DataPart) {
		if (data.length === 0) return []

		const formattedData = data.map((item) => {
			return `${JSON.stringify(item)}`
		})

		return ["Here's the data you requested:", ...formattedData]
	},
})
