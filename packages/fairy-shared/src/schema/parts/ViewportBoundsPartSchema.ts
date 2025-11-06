import { Box } from 'tldraw'
import z from 'zod'
import { BoxModelSchema } from '../../format/PeripheralCluster'
import { PromptPartRegistry } from '../PromptPartRegistry'

export type ViewportBoundsPart = z.infer<typeof ViewportBoundsPartSchema>
export const ViewportBoundsPartSchema = z.object({
	type: z.literal('viewportBounds'),
	userBounds: BoxModelSchema.nullable(),
	agentBounds: BoxModelSchema.nullable(),
})

ViewportBoundsPartSchema.register(PromptPartRegistry, {
	priority: -75,
	buildContent({ userBounds, agentBounds }: ViewportBoundsPart) {
		const response = []

		if (agentBounds) {
			response.push(
				`The bounds of the part of the canvas that you can currently see are: ${JSON.stringify(agentBounds)}`
			)
		}
		if (userBounds) {
			const userViewCenter = Box.From(userBounds).center
			response.push(`The user's view is centered at (${userViewCenter.x}, ${userViewCenter.y}).`)
		}

		return response
	},
})
