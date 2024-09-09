import { db } from '@/utils/ContentDatabase'
import { nicelog } from '@/utils/nicelog'
import { replaceMarkdownLinks } from '@/utils/replace-md-links'
import { assert, compact } from '@tldraw/utils'
import algoliasearch from 'algoliasearch'
import { config } from 'dotenv'
import { Nodes, Root } from 'mdast'
import { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx'
import { remark } from 'remark'
import remarkMdx from 'remark-mdx'

config()

// Add nodes to mdast content.
declare module 'mdast' {
	interface BlockContentMap {
		/**
		 * MDX JSX element node, occurring in flow (block).
		 */
		mdxJsxFlowElement: MdxJsxFlowElement
	}

	interface PhrasingContentMap {
		/**
		 * MDX JSX element node, occurring in text (phrasing).
		 */
		mdxJsxTextElement: MdxJsxTextElement
	}

	interface RootContentMap {
		/**
		 * MDX JSX element node, occurring in flow (block).
		 */
		mdxJsxFlowElement: MdxJsxFlowElement
		/**
		 * MDX JSX element node, occurring in text (phrasing).
		 */
		mdxJsxTextElement: MdxJsxTextElement
	}
}

const sectionPriority = {
	'getting-started': 0,
	docs: 1,
	examples: 2,
	reference: 3,
	releases: 4,
	community: 5,
}

async function getAllArticles() {
	const articles = await (
		await db.getDb()
	).all(
		`SELECT title, description, path, id, sectionId, sectionIndex AS articleIndex,
		(SELECT title FROM sections WHERE sections.id = articles.sectionId) AS section,
		(SELECT title FROM categories WHERE categories.id = articles.categoryId) AS category 
		FROM articles`
	)
	const articlesWithHeadings = await Promise.all(
		articles.map(async (article) => {
			const headings = await db.getArticleHeadings(article.id)
			return {
				...article,
				joinedHeadings: headings.map(({ title }) => replaceMarkdownLinks(title)).join(' | '),
			}
		})
	)

	return {
		docs: articlesWithHeadings.filter((article) => article.sectionId !== 'blog'),
		blog: articlesWithHeadings.filter((article) => article.sectionId === 'blog'),
	}
}

async function updateAlgoliaIndex() {
	try {
		const page = await db.getPageContent('/reference/validate/UnionValidator')
		assert(page?.type === 'article')

		const file = await remark()
			.use(remarkMdx)
			.use(() => (tree: Root) => {
				function visit(node: Nodes): Nodes | Nodes[] | null {
					console.group(node.type)
					try {
						if ('children' in node) {
							node.children = compact(node.children.map(visit)).flat() as any
						}

						if (node.type === 'code') return null
						if (node.type === 'mdxJsxFlowElement') return node.children

						return node
					} finally {
						console.groupEnd()
					}
				}

				visit(tree)
			})
			.process(page.article.content ?? '')

		console.log(file.toString())
		return
		const { docs, blog } = await getAllArticles()
		console.log(JSON.stringify(docs, null, 2))
		return

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
