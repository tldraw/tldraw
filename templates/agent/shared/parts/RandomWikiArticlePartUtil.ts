import { TldrawAgent } from '../../client/agent/TldrawAgent'
import { WikipediaResponse } from '../../worker/routes/getRandomWikipediaArticle'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil } from './PromptPartUtil'

export interface RandomWikiArticlePart extends BasePromptPart<'randomWikiArticle'> {
	article: {
		title: string
		extract: string
		url: string
		pageId: number
		thumbnail?: string
	} | null
}

export class RandomWikiArticlePartUtil extends PromptPartUtil<RandomWikiArticlePart> {
	static override type = 'randomWikiArticle' as const

	override getPriority() {
		return 60
	}

	override async getPart(
		request: AgentRequest,
		_agent: TldrawAgent
	): Promise<RandomWikiArticlePart> {
		if (request.type !== 'user') {
			return { type: 'randomWikiArticle', article: null }
		}

		try {
			const response = await fetch('/random-wikipedia-article', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			})

			if (!response.ok) {
				return { type: 'randomWikiArticle', article: null }
			}

			const article: WikipediaResponse = await response.json()
			return { type: 'randomWikiArticle', article }
		} catch (error) {
			console.error('Failed to fetch random Wikipedia article:', error)
			return { type: 'randomWikiArticle', article: null }
		}
	}

	override buildContent({ article }: RandomWikiArticlePart) {
		if (!article) return []

		return [
			`Here's a random Wikipedia article for you to enjoy!`,
			`**${article.title}**`,
			article.extract,
		]
	}
}
