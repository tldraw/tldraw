import z from 'zod'

export const RandomWikipediaArticleActionSchema = z
	.object({
		_type: z.literal('random-wikipedia-article'),
	})
	.meta({
		title: 'Get random wikipedia article',
		description: 'The fairy gets inspiration from a random Wikipedia article.',
	})

export type RandomWikipediaArticleAction = z.infer<typeof RandomWikipediaArticleActionSchema>
