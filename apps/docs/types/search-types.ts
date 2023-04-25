export type SearchResult = {
	type: 'article' | 'category' | 'section'
	id: string
	subtitle: string
	title: string
	url: string
}
