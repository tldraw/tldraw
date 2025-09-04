interface WikipediaResponse {
	title: string
	extract: string
	url: string
	pageId: number
	thumbnail?: string
}

export async function getRandomWikipediaArticle(): Promise<WikipediaResponse> {
	const response = await fetch('/wikipedia', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
	})

	if (!response.ok) {
		throw new Error(`Failed to fetch Wikipedia article: ${response.status}`)
	}

	return response.json()
}
