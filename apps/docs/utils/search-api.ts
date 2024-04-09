export const SEARCH_RESULTS = {
	articles: [],
	apiDocs: [],
	examples: [],
}
export const searchBucket = (sectionId: string) =>
	sectionId === 'examples' ? 'examples' : sectionId === 'reference' ? 'apiDocs' : 'articles'
export const sectionTypeBucket = (sectionId: string) =>
	['examples', 'reference'].includes(sectionId) ? sectionId : 'docs'
