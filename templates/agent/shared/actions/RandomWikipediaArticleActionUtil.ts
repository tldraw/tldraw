import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const RandomWikipediaArticleAction = z
	.object({
		_type: z.literal('getInspiration'),
	})
	.meta({
		title: 'Get inspiration',
		description: 'The AI gets inspiration from a random Wikipedia article.',
	})

type RandomWikipediaArticleAction = z.infer<typeof RandomWikipediaArticleAction>

export class RandomWikipediaArticleActionUtil extends AgentActionUtil<RandomWikipediaArticleAction> {
	static override type = 'getInspiration' as const

	override getSchema() {
		return RandomWikipediaArticleAction
	}

	override getInfo(action: Streaming<RandomWikipediaArticleAction>) {
		const description = action.complete
			? 'Got random Wikipedia article'
			: 'Getting random Wikipedia article'
		return {
			icon: 'search' as const,
			description,
		}
	}

	override async applyAction(
		action: Streaming<RandomWikipediaArticleAction>,
		_helpers: AgentHelpers
	) {
		// Wait until the action has finished streaming
		if (!action.complete) return
		if (!this.agent) return

		const article = await fetchRandomWikipediaArticle()
		this.agent.schedule({ data: [article] })
	}
}

export async function fetchRandomWikipediaArticle() {
	const response = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary', {
		headers: { 'User-Agent': 'tldraw' },
	})

	if (!response.ok) {
		throw new Error(`Wikipedia API returned status ${response.status}, ${response.statusText}`)
	}

	const data: WikipediaApiResponse = await response.json()
	return {
		title: data.title,
		extract: data.extract,
		url: data.content_urls.desktop.page,
		pageId: data.pageid,
	}
}

interface WikipediaApiResponse {
	type: string
	title: string
	displaytitle: string
	namespace: {
		id: number
		text: string
	}
	wikibase_item: string
	titles: {
		canonical: string
		normalized: string
		display: string
	}
	pageid: number
	thumbnail?: {
		source: string
		width: number
		height: number
	}
	originalimage?: {
		source: string
		width: number
		height: number
	}
	lang: string
	dir: string
	revision: string
	tid: string
	timestamp: string
	description: string
	description_source: string
	content_urls: {
		desktop: {
			page: string
			revisions: string
			edit: string
			talk: string
		}
		mobile: {
			page: string
			revisions: string
			edit: string
			talk: string
		}
	}
	extract: string
	extract_html: string
}
