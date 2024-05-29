export interface SearchResult {
	type: 'article' | 'category' | 'section' | 'heading'
	id: string
	subtitle: string
	sectionType: string
	title: string
	url: string
	score: number
}

export enum SEARCH_TYPE {
	AI = 'ai',
	NORMAL = 'n',
}
