export type SearchResult = {
	type: 'article' | 'category' | 'section' | 'heading'
	id: string
	subtitle: string
	title: string
	url: string
	score: number
}
