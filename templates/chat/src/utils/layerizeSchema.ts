import { z } from 'zod'

const coordinates = z.tuple([z.number(), z.number(), z.number(), z.number()])
export const layerizeResultSchema = z.object({
	layers: z
		.array(
			z.object({
				image: z.object({ url: z.url() }),
				z_index: z.number().int(),
				bounding_box: z.object({ normalized: coordinates }).nullish(),
				name: z.string().optional(),
			})
		)
		.min(1)
		.max(17),
})
