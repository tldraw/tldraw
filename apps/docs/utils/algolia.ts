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

const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development'
const tldrawEnv =
	vercelEnv === 'preview' && process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF === 'main'
		? 'staging'
		: vercelEnv

export function getSearchIndexName(name: SearchIndexName) {
	return `${name}-${tldrawEnv}`
}
