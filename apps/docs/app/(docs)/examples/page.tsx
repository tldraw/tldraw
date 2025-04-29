import { PageTitle } from '@/components/common/page-title'
import { Content } from '@/components/content'
import { DocsMobileSidebar } from '@/components/docs/docs-mobile-sidebar'
import { DocsSidebar } from '@/components/docs/docs-sidebar'
import { SearchButton } from '@/components/search/SearchButton'
import { connect } from '@/scripts/lib/connect'
import { Article } from '@/types/content-types'

// export async function generateMetadata({
// 	params,
// }: {
// 	params: { slug: string | string[] }
// }): Promise<Metadata> {
// 	const path = typeof params.slug === 'string' ? [params.slug] : params.slug
// 	const content = await db.getPageContent(`/${path.join('/')}`)
// 	if (!content || content.type !== 'article') notFound()
// 	const metadata: Metadata = { title: content.article.title }
// 	if (content.article.description) {
// 		metadata.description = content.article.description
// 	} else {
// 		const parsed = parseMarkdown(content.article.content ?? '', content.article.id)
// 		const initialContentText = parsed.initialContentText.trim()
// 		if (initialContentText) metadata.description = initialContentText
// 	}
// 	return metadata
// }

// const nonDocsPaths = ['/blog/', '/legal/']
// export async function generateStaticParams() {
// 	const paths = await db.getAllPaths()
// 	return paths
// 		.filter((path) => !nonDocsPaths.some((nonDocsPath) => path.startsWith(nonDocsPath)))
// 		.map((path) => ({ slug: path.slice(1).split('/') }))
// }

export default async function Page({ params: _params }: { params: { slug: string | string[] } }) {
	// const path = typeof params.slug === 'string' ? [params.slug] : params.slug
	// const content = await db.getPageContent(`/${path.join('/')}`)
	// if (!content || content.type !== 'article') notFound()

	const db = await connect({ mode: 'readonly' })
	const examples = (await db.all(
		'SELECT * FROM articles WHERE sectionId = "examples"'
	)) as Article[]

	const examplesByCategory: Record<string, Article[]> = {}
	for (const example of examples) {
		if (!examplesByCategory[example.categoryId]) {
			examplesByCategory[example.categoryId] = []
		}
		examplesByCategory[example.categoryId].push(example)
	}
	const exampleCategories = Object.keys(examplesByCategory).map((categoryId) => ({
		id: categoryId,
		examples: examplesByCategory[categoryId],
	}))

	return (
		<div className="w-full max-w-screen-xl mx-auto md:px-5 md:flex md:pt-8 isolate">
			<DocsSidebar
				sectionId="examples"
				// categoryId={'examples'}
				// articleId={content.article.id}
			/>
			<div className="sticky top-14 z-10 flex items-center justify-between w-full h-12 px-5 bg-white border-b border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 backdrop-blur md:hidden">
				<DocsMobileSidebar
					sectionId="examples"
					// categoryId={content.article.categoryId}
					// articleId={content.article.id}
				/>
				<SearchButton type="docs" layout="mobile" className="hidden -mr-2 sm:block" />
			</div>
			<main className="relative w-full px-5 pt-12 shrink md:pt-0 min-w-[1px]">
				<section className="pb-6 mb-6 md:mb-8 md:pb-8 border-b border-zinc-100 dark:border-zinc-800">
					<div className="flex flex-wrap justify-between gap-x-8 gap-y-3">
						<PageTitle>Examples</PageTitle>
					</div>
				</section>
				{exampleCategories.map((category) => (
					<ExampleCategory
						key={category.id}
						categoryId={category.id}
						examples={category.examples}
					/>
				))}
				<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
					{/* {examples.map((example) => (
						<div key={example.id} className="mb-8 h-full">
							<a
								href={`/examples/${example.id}`}
								className="flex flex-col h-full p-4 bg-white border border-zinc-200 rounded-lg shadow-sm hover:shadow-md dark:bg-zinc-950 dark:border-zinc-800"
							>
								<h2 className="text-lg font-semibold">{example.title}</h2>
								<p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 flex-grow">
									{example.description}
								</p>
							</a>
						</div>
					))} */}
				</div>

				{/* <div className="mx-auto w-full max-w-sm">
					<DocsFeedbackWidget className="mb-12" />
				</div> */}
			</main>
		</div>
	)
}

export const EXAMPLES_CATEGORY_NAMES: Record<string, string> = {
	basic: 'Getting started',
	ui: 'UI & theming',
	'shapes/tools': 'Shapes & tools',
	'data/assets': 'Data & assets',
	'editor-api': 'Editor API',
	collaboration: 'Collaboration',
	'use-cases': 'Use cases',
}

function ExampleCategory({ categoryId, examples }: { categoryId: string; examples: Article[] }) {
	return (
		<section className="mb-12">
			<h2 className="mb-4 text-2xl font-semibold">{EXAMPLES_CATEGORY_NAMES[categoryId]}</h2>
			<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
				{examples.map((example) => {
					return (
						<div key={example.id} className="mb-8 h-full">
							<a
								href={`/examples/${example.id}`}
								className="flex flex-col h-full p-4 bg-white border border-zinc-200 rounded-lg shadow-sm hover:shadow-md dark:bg-zinc-950 dark:border-zinc-800"
							>
								<h2 className="text-lg font-semibold">{example.title}</h2>
								<div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 flex-grow">
									<Content mdx={example.description ?? ''} />
								</div>
							</a>
						</div>
					)
				})}
			</div>
		</section>
	)
}
