import z from 'zod'
import { fetchRandomWikipediaArticle } from '../../client/api/fetchRandomWikipediaArticle'
import { AgentRequestTransform } from '../AgentRequestTransform'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const GetRandomWikipediaArticleAction = z
	.object({
		_type: z.literal('getInspiration'),
	})
	.meta({
		title: 'Get inspiration',
		description: 'The AI gets inspiration from a random Wikipedia article',
	})

type IGetRandomWikipediaArticleAction = z.infer<typeof GetRandomWikipediaArticleAction>

export class GetRandomWikipediaArticleActionUtil extends AgentActionUtil<IGetRandomWikipediaArticleAction> {
	static override type = 'getInspiration' as const

	override getSchema() {
		return GetRandomWikipediaArticleAction
	}

	override getInfo(action: Streaming<IGetRandomWikipediaArticleAction>) {
		const description = action.complete
			? 'Got random Wikipedia article'
			: 'Getting random Wikipedia article'
		return {
			icon: 'search' as const,
			description,
		}
	}

	override async applyAction(
		action: Streaming<IGetRandomWikipediaArticleAction>,
		transform: AgentRequestTransform
	) {
		if (!action.complete) return
		const { agent } = transform

		agent.schedule()
		return await fetchRandomWikipediaArticle()
	}
}
