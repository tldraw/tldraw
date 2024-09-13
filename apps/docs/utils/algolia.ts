export interface SearchEntry {
	objectID: string

	/** Path do this article (not including slug) */
	path: string
	/** The nicely-formatted title of this entry. mostly for display. */
	title: string
	/** `title`, but with the heading placed first, so it matches with higher priority */
	titleHeadingFirst: string
	/** Any additional keywords specified for this entry */
	keywords: string[]
	/** A short description of the entry */
	description: string | null
	/** Plain-text entry content */
	content: string

	/** Name of the section this entry belongs to */
	section: string
	/** how relevant is that section? higher is better */
	sectionPriority: number

	/** Title of the article this entry belongs to. Same as `title` if `heading` is null */
	article: string
	/** Position of the article within the section */
	articleIndex: number

	/** The heading within an article this is an entry for */
	heading: string | null
	/** The heading slug - how to locate the heading within the artice */
	headingSlug: string | null
	/** Position of the heading within the article */
	headingIndex: number

	/** Manual rank adjustment for e.g. inherited entries */
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
	if (tldrawEnv === 'production') return name
	return `${name}-${tldrawEnv}`
}
