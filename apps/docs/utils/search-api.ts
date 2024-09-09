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
