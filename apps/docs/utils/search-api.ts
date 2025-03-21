import algoliasearch from 'algoliasearch'

export const SEARCH_RESULTS = {
	articles: [],
	apiDocs: [],
	examples: [],
}
export function searchBucket(sectionId: string) {
	return sectionId === 'examples' ? 'examples' : sectionId === 'reference' ? 'apiDocs' : 'articles'
}
export function sectionTypeBucket(sectionId: string) {
	return ['examples', 'reference'].includes(sectionId) ? sectionId : 'docs'
}

export const searchClient = algoliasearch(
	process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
	process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
)
