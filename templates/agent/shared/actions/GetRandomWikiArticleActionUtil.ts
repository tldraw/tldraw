import z from 'zod'
import { getRandomWikipediaArticle } from '../../client/api/getRandomWikipediaArticle'
import { AgentRequestTransform } from '../AgentRequestTransform'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const GetRandomWikiArticleAction = z
	.object({
		_type: z.literal('getInspiration'),
	})
	.meta({
		title: 'Get inspiration',
		description: 'The AI gets inspiration from a random Wikipedia article',
	})

type IGetRandomWikiArticleAction = z.infer<typeof GetRandomWikiArticleAction>

export class GetRandomWikiArticleActionUtil extends AgentActionUtil<IGetRandomWikiArticleAction> {
	static override type = 'getInspiration' as const

	override getSchema() {
		return GetRandomWikiArticleAction
	}

	override getInfo(action: Streaming<IGetRandomWikiArticleAction>) {
		const description = action.complete
			? 'Got random Wikipedia article'
			: 'Getting random Wikipedia article'
		return {
			icon: 'search' as const,
			description,
		}
	}

	override applyAction(
		action: Streaming<IGetRandomWikiArticleAction>,
		transform: AgentRequestTransform
	) {
		if (!action.complete) return
		const { agent } = transform

		agent.scheduleAsync(
			GetRandomWikiArticleActionUtil.type,
			async () => await getRandomWikipediaArticle()
		)
	}
}
