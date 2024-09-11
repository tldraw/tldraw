export interface SearchEntry {
	objectID: string

	path: string
	title: string
	keywords: string[]
	description: string | null
	content: string

	section: string
	sectionPriority: number

	article: string
	articleIndex: number

	heading: string | null
	headingHash: string | null
	headingIndex: number

	rankAdjust: number
}

export interface SearchEntryWithIndex extends SearchEntry {
	index: SearchIndexName
}

export type SearchIndexName = 'docs' | 'blog'

export function getSearchIndexName(name: SearchIndexName) {
	return `${name}-${process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development'}`
}
