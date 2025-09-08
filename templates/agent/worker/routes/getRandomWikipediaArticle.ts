import { IRequest } from 'itty-router'
import { WikipediaArticle } from '../../shared/types/WikipediaArticle'
import { Environment } from '../types'

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

export async function getRandomWikipediaArticle(
	_request: IRequest,
	_env: Environment
): Promise<Response> {
	try {
		const articleData = await fetchArticle()

		return new Response(JSON.stringify(articleData), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		})
	} catch (error: any) {
		console.error('Wikipedia API error:', error)
		return new Response(JSON.stringify({ error: 'Failed to fetch Wikipedia article' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		})
	}
}

async function fetchArticle(): Promise<WikipediaArticle> {
	const url = 'https://en.wikipedia.org/api/rest_v1/page/random/summary'
	const response = await fetch(url, {
		headers: {
			'User-Agent': 'tldraw',
		},
	})

	if (!response.ok) {
		throw new Error(
			`Wikipedia API returned status ${response.status}, ${response.statusText}, ${await response.text()}`
		)
	}

	const data: WikipediaApiResponse = await response.json()

	return {
		title: data.title,
		extract: data.extract || 'No extract available',
		url: data.content_urls?.desktop?.page,
		pageId: data.pageid,
	}
}
