import z from 'zod'
import { FocusShapePartialSchema, FocusShapeTypeSchema } from '../../format/FocusShape'
import { PromptPartRegistry } from '../PromptPartRegistry'

export type UserActionHistoryPart = z.infer<typeof UserActionHistoryPartSchema>
export const UserActionHistoryPartSchema = z.object({
	type: z.literal('userActionHistory'),
	added: z.array(
		z.object({
			shapeId: z.string(),
			type: FocusShapeTypeSchema,
		})
	),
	removed: z.array(
		z.object({
			shapeId: z.string(),
			type: FocusShapeTypeSchema,
		})
	),
	updated: z.array(
		z.object({
			shapeId: z.string(),
			type: FocusShapeTypeSchema,
			before: FocusShapePartialSchema,
			after: FocusShapePartialSchema,
		})
	),
})

UserActionHistoryPartSchema.register(PromptPartRegistry, {
	priority: -40,
	buildContent(part: UserActionHistoryPart) {
		const { updated, removed, added } = part
		if (updated.length === 0 && removed.length === 0 && added.length === 0) {
			return []
		}
		return [
			'Since the previous request, the user has made the following changes to the canvas:',
			JSON.stringify(part),
		]
	},
})
