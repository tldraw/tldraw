import z from 'zod'
import { PeripheralClusterSchema } from '../../format/PeripheralCluster'
import { PromptPartRegistry } from '../PromptPartRegistry'

export type PeripheralShapesPart = z.infer<typeof PeripheralShapesPartSchema>
export const PeripheralShapesPartSchema = z.object({
	type: z.literal('peripheralShapes'),
	clusters: z.array(PeripheralClusterSchema).nullable(),
})

PeripheralShapesPartSchema.register(PromptPartRegistry, {
	priority: -65,
	buildContent({ clusters }: PeripheralShapesPart) {
		if (!clusters || clusters.length === 0) {
			return []
		}
		return [
			"There are some groups of shapes in your peripheral vision, outside the your main view. You can't make out their details or content. If you want to see their content, you need to get closer. The groups are as follows",
			JSON.stringify(clusters),
		]
	},
})
