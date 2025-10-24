import z from 'zod'
import { FocusedShapePartialSchema, FocusedShapeTypeSchema } from '../../format/FocusedShape'
import { PromptPartRegistry } from '../PromptPartRegistry'

export type UserActionHistoryPart = z.infer<typeof UserActionHistoryPartSchema>
export const UserActionHistoryPartSchema = z.object({
	type: z.literal('userActionHistory'),
	added: z.array(
		z.object({
			shapeId: z.string(),
			type: FocusedShapeTypeSchema,
		})
	),
	removed: z.array(
		z.object({
			shapeId: z.string(),
			type: FocusedShapeTypeSchema,
		})
	),
	updated: z.array(
		z.object({
			shapeId: z.string(),
			type: FocusedShapeTypeSchema,
			before: FocusedShapePartialSchema,
			after: FocusedShapePartialSchema,
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
