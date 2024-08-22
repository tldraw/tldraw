import { getAllArticles } from '@/utils/get-all-articles'
import { nicelog } from '@/utils/nicelog'
import algoliasearch from 'algoliasearch'

const sectionPriority = {
	'getting-started': 0,
	docs: 1,
	examples: 2,
	reference: 3,
	releases: 4,
	community: 5,
}

const updateAlgoliaIndex = async () => {
	try {
		const { docs, blog } = await getAllArticles()
		const client = algoliasearch(
			process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
			process.env.ALGOLIA_API_KEY!
		)

		nicelog(`Indexing ${docs.length} docs articles...`)
		const docsIndex = client.initIndex('docs')
		await docsIndex.replaceAllObjects(
			// @ts-ignore
			docs.map((article) => ({ ...article, sectionPriority: sectionPriority[article.sectionId] })),
			{ autoGenerateObjectIDIfNotExist: true }
		)
		nicelog('Done.')

		nicelog(`Indexing ${blog.length} blog posts...`)
		const blogIndex = client.initIndex('blog')
		await blogIndex.replaceAllObjects(blog, { autoGenerateObjectIDIfNotExist: true })
		nicelog('Done.')
	} catch (error) {
		nicelog(error)
	}
}

updateAlgoliaIndex()
