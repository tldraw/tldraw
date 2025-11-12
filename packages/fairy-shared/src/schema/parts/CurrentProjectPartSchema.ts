import z from 'zod'
import { FairyProjectSchema } from '../FairyProject'
import { PromptPartRegistry } from '../PromptPartRegistry'

export type CurrentProjectPart = z.infer<typeof CurrentProjectPartSchema>
export const CurrentProjectPartSchema = z
	.object({
		type: z.literal('currentProject'),
		project: FairyProjectSchema.nullable(),
	})
	.meta({
		priority: -10,
	})

CurrentProjectPartSchema.register(PromptPartRegistry, {
	priority: -10,
	buildContent(part: CurrentProjectPart) {
		if (!part.project) {
			return []
		}

		const { id, orchestratorId, name, description, color, memberIds } = part.project

		return [
			'Current Project:',
			`Project ID: ${id}`,
			`Project Name: ${name}`,
			`Project Description: ${description}`,
			`Orchestrator ID: ${orchestratorId}`,
			`Project Color: ${color}`,
			`Member IDs: ${memberIds.join(', ')}`,
		]
	},
})
