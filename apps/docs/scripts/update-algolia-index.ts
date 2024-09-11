import { db } from '@/utils/ContentDatabase'
import {
	SearchEntry,
	SearchEntryWithIndex,
	SearchIndexName,
	getSearchIndexName,
} from '@/utils/algolia'
import { nicelog } from '@/utils/nicelog'
import { markdownToPlainText, parseHeadings } from '@/utils/parse-markdown'
import { assertExists, groupBy, objectMapEntries } from '@tldraw/utils'
import algoliasearch from 'algoliasearch'
import console from 'console'
import { config } from 'dotenv'

config()

// set each section with a search config. higher priority means it will be more likely to appear in
// search results.
const sectionConfig: Record<string, SearchConfig | null> = {
	'getting-started': {
		index: 'docs',
		priority: 10,
		splitHeadings: false,
	},
	docs: {
		index: 'docs',
		priority: 9,
		splitHeadings: true,
	},
	examples: {
		index: 'docs',
		priority: 8,
		splitHeadings: false,
	},
	reference: {
		index: 'docs',
		priority: 7,
		splitHeadings: true,
		excludeHeadingLevels: [2],
		formatHeading(article, heading) {
			return `${article.title}.${heading}`
		},
	},

	releases: {
		index: 'docs',
		priority: 6,
		splitHeadings: false,
	},
	community: {
		index: 'docs',
		priority: 4,
		splitHeadings: true,
	},
	legal: null,
	blog: {
		index: 'blog',
		priority: 10,
		splitHeadings: false,
	},
}

interface SearchConfig {
	index: SearchIndexName
	priority: number
	splitHeadings: boolean
	excludeHeadingLevels?: number[]
	formatHeading?(article: Article, heading: string): string
}

interface Article {
	title: string
	description: string | null
	path: string | null
	id: string
	sectionId: string
	articleIndex: number
	content: string
	sectionTitle: string
	categoryTitle: string
	keywords: string[]
}

async function getAllArticles(): Promise<Article[]> {
	const sqlite = await db.getDb()
	const articles = await sqlite.all(
		`SELECT title, description, path, id, sectionId, sectionIndex AS articleIndex, content, keywords,
		(SELECT title FROM sections WHERE sections.id = articles.sectionId) AS sectionTitle,
		(SELECT title FROM categories WHERE categories.id = articles.categoryId) AS categoryTitle
		FROM articles`
	)

	return articles.map((article) => ({
		...article,
		keywords: article.keywords.split(',').map((keyword: string) => keyword.trim()),
	}))
}

function getConfig(article: Article) {
	const config = sectionConfig[article.sectionId]
	if (config === undefined) {
		throw new Error(`No search config found for section ${article.sectionId} (${article.path})`)
	}
	return config
}

function getSearchEntriesForArticle(article: Article): SearchEntryWithIndex[] {
	const config = getConfig(article)
	if (!config) return []

	if (config.splitHeadings) {
		const { headings, initialContentText } = parseHeadings(article.content)
		return [
			{
				objectID: article.id,
				index: config.index,

				path: assertExists(article.path),
				title: article.title,
				keywords: article.keywords,
				description: article.description,
				content: initialContentText,

				section: article.sectionTitle,
				sectionPriority: config.priority,

				article: article.title,
				articleIndex: article.articleIndex,

				heading: null,
				headingHash: null,
				headingIndex: 0,

				rankAdjust: 0,
			},
			...headings

				.filter((heading) => {
					return (
						// excluded headers from config:
						!config.excludeHeadingLevels?.includes(heading.level)
					)
				})
				.map((heading, i) => ({
					objectID: `${article.id}#${i}`,
					index: config.index,

					path: assertExists(article.path),
					title: config.formatHeading
						? config.formatHeading(article, heading.title)
						: `${heading.title} • ${article.title}`,
					description: '',
					keywords: [],
					content: heading.contentText,

					section: article.sectionTitle,
					sectionPriority: config.priority,

					article: article.title,
					articleIndex: article.articleIndex,

					heading: heading.title,
					headingHash: heading.slug,
					headingIndex: i + 1,

					// all things being equal, inherited entries should rank lower than non-inherited entries
					rankAdjust: heading.isInherited ? -1 : 0,
				})),
		]
	} else {
		return [
			{
				objectID: article.id,
				index: config.index,

				path: assertExists(article.path),
				title: article.title,
				keywords: article.keywords,
				description: article.description,
				content: markdownToPlainText(article.content),

				section: article.sectionTitle,
				sectionPriority: config.priority,

				article: article.title,
				articleIndex: article.articleIndex,

				heading: null,
				headingHash: null,
				headingIndex: 0,

				rankAdjust: 0,
			},
		]
	}
}

async function updateAlgoliaIndex() {
	nicelog('Converting articles to search entries...')
	try {
		console.time('✔️ Get articles')
		const articles = await getAllArticles()
		console.timeEnd('✔️ Get articles')

		console.time('✔️ Format search entries')
		const entries: SearchEntryWithIndex[] = []
		for (const article of articles) {
			entries.push(...(await getSearchEntriesForArticle(article)))
		}
		console.timeEnd('✔️ Format search entries')
		nicelog('')

		if (!process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || !process.env.ALGOLIA_API_KEY) {
			if ((process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development') === 'development') {
				nicelog(
					'❌ Skipping Algolia indexing in development because NEXT_PUBLIC_ALGOLIA_APP_ID and ALGOLIA_API_KEY are not set.'
				)
				return
			}
			throw new Error('NEXT_PUBLIC_ALGOLIA_APP_ID and ALGOLIA_API_KEY must be set')
		}

		const client = algoliasearch(
			process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
			process.env.ALGOLIA_API_KEY!
		)

		const byIndex = groupBy(entries, (entry) => entry.index) as Record<
			SearchIndexName,
			SearchEntryWithIndex[]
		>

		for (const [_indexName, entries] of objectMapEntries(byIndex)) {
			const indexName = getSearchIndexName(_indexName)
			nicelog(`Indexing ${entries.length} entries into ${indexName}...`)
			console.time('✔️ Index complete')

			const index = client.initIndex(indexName)
			await index.replaceAllObjects(
				entries.map(({ index: _, ...entry }): SearchEntry => entry),
				{ autoGenerateObjectIDIfNotExist: true }
			)
			await index.setSettings({
				searchableAttributes: ['title', 'description', 'keywords', 'content'],
				camelCaseAttributes: ['title', 'description', 'keywords', 'content'],
				// these are only applied _after_ keyword search is complete. if two entries have
				// the same keyword search score, this will be used to tiebreak them.
				customRanking: [
					// rankAdjust makes certain entries appear higher or lower in search results.
					// e.g. inherited members get pushed to the bottom
					'desc(rankAdjust)',
					// sort by section priority so high-signal content (like our guides) appear
					// higher than lower-signal content like API references
					'desc(sectionPriority)',
					// otherwise just keep things in the order they appear
					'asc(articleIndex)',
					'asc(headingIndex)',
				],
			})

			const resultsToShowForEmptySearch = entries
				.sort((a, b) => {
					if (a.sectionPriority !== b.sectionPriority) return b.sectionPriority - a.sectionPriority
					if (a.articleIndex !== b.articleIndex) return a.articleIndex - b.articleIndex
					return a.headingIndex - b.headingIndex
				})
				.filter((entry) => !entry.heading)
				.slice(0, 20)

			await index.replaceAllRules([
				{
					objectID: 'EmptySearch',
					enabled: true,
					condition: {
						pattern: '',
						anchoring: 'is',
					},
					consequence: {
						promote: resultsToShowForEmptySearch.map((entry, i) => ({
							objectID: entry.objectID,
							position: i,
						})),
					},
				},
			])
			console.timeEnd('✔️ Index complete')
			nicelog('')
		}

		nicelog('Done.')
	} catch (error) {
		nicelog(error)
		process.exit(1)
	}
}

updateAlgoliaIndex()
