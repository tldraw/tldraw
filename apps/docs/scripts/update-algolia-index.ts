import { getAllArticles } from '@/utils/get-all-articles'
import algoliasearch from 'algoliasearch'
import { remark } from 'remark'
import mdx from 'remark-mdx'

const updateAlgoliaIndex = async () => {
	try {
		const client = algoliasearch('KKH5LYXYV9', process.env.ALGOLIA_API_KEY!)
		const strip = require('remark-mdx-to-plain-text')

		const { blog, docs } = await getAllArticles()

		console.log(`Indexing ${docs.length} docs articles...`)
		const docsIndex = client.initIndex('docs')
		const res = await docsIndex.replaceAllObjects(
			docs.map((article) => ({
				objectID: article.path,
				title: article.title,
				description: article.description,
				content: remark().use(mdx).use(strip).process(article.content),
			}))
		)

		console.log('Done.', res)
	} catch (error) {
		console.log(error)
	}
}

updateAlgoliaIndex()
