import { WikipediaArticle } from "../../shared/types/WikipediaArticle"

export async function fetchRandomWikipediaArticle(): Promise<WikipediaArticle> {
	const response = await fetch('/random-wikipedia-article', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
	})

	if (!response.ok) {
		throw new Error(`Failed to fetch Wikipedia article: ${response.status}`)
	}

	return response.json()
}
