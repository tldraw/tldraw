import { BlogMobileSidebar } from '@/components/blog/blog-mobile-sidebar'
import { BlogPostPreview } from '@/components/blog/blog-post-preview'
import { BlogSidebar } from '@/components/blog/blog-sidebar'
import { Content } from '@/components/content'
import { Example } from '@/components/content/example'
import { Breadcrumbs } from '@/components/docs/breadcrumbs'
import { Footer } from '@/components/docs/footer'
import { Header } from '@/components/docs/header'
import { TableOfContents } from '@/components/docs/table-of-contents'
import { MobileSidebar } from '@/components/navigation/mobile-sidebar'
import { PageTitle } from '@/components/page-title'
import { SearchButton } from '@/components/search/button'
import { Sidebar } from '@/components/sidebar'
import { getDb } from '@/utils/ContentDatabase'
import { getPageContent } from '@/utils/get-page-content'
import { notFound } from 'next/navigation'
import { ReactNode } from 'react'

export default async function Page({ params }: { params: { slug: string | string[] } }) {
	const path = typeof params.slug === 'string' ? [params.slug] : params.slug
	const content = await getPageContent(`/${path.join('/')}`)
	if (!content) notFound()

	if (content.type === 'section') {
		const { section } = content
		if (content.section.id === 'blog') {
			const db = await getDb()
			const categories = await db.getCategoriesForSection('blog')
			const articlesForCategories = await Promise.allSettled(
				categories.map(async (category) => {
					const articles = await db.getCategoryArticles(section.id, category.id)
					return { category, articles }
				})
			)

			return (
				<BlogLayout>
					<>
						<section className="pb-6 mb-6 md:mb-12 md:pb-12 border-b border-zinc-100">
							<PageTitle>{section.title}</PageTitle>
							<p className="mt-4 text-zinc-800 text-lg max-w-2xl">{section.description}</p>
						</section>
						{articlesForCategories.map((result) => {
							if (result.status === 'rejected') return null

							const { category, articles } = result.value

							// Don't show categoties without articles
							if (articles.length === 0) return null

							// Don't show the "uncategorized" category
							if (category.id.endsWith('ucg')) return null

							return (
								<section key={category.id + '_articles'} className="space-y-12">
									<p className="mt-4 text-zinc-800 text-lg max-w-2xl">{category.title}</p>
									{articles
										.sort(
											(a, b) =>
												new Date(a.date ?? new Date()).getTime() -
												new Date(b.date ?? new Date()).getTime()
										)
										.map((post, index) => (
											<BlogPostPreview key={index} post={post} />
										))}
								</section>
							)
						})}
					</>
				</BlogLayout>
			)
		}
	} else if (content.type === 'category') {
		const { category } = content
		const db = await getDb()
		const section = await db.getSection(category.sectionId)

		if (category.sectionId === 'blog') {
			const articles = await db.getCategoryArticles(category.sectionId, category.id)

			return (
				<BlogLayout>
					<section className="pb-6 mb-6 md:mb-12 md:pb-12 border-b border-zinc-100">
						<Breadcrumbs section={section} className="mb-2" />
						<PageTitle>{category.title}</PageTitle>
						<p className="mt-4 text-zinc-800 md:text-lg max-w-2xl">{category.description}</p>
					</section>
					<section className="space-y-12">
						{articles
							.sort(
								(a, b) =>
									new Date(a.date ?? Date.now()).getTime() -
									new Date(b.date ?? Date.now()).getTime()
							)
							.map((post, index) => (
								<BlogPostPreview key={index} post={post} />
							))}
					</section>
				</BlogLayout>
			)
		}
	} else if (content.type === 'article') {
		const { article } = content
		const db = await getDb()
		const category = await db.getCategory(article.categoryId)
		const section = await db.getSection(article.sectionId)
		if (article.sectionId === 'blog') {
			return (
				<BlogLayout>
					<section className="pb-6 mb-6 md:mb-12 md:pb-12 border-b border-zinc-100">
						<Breadcrumbs section={section} category={category} className="mb-2" />
						<PageTitle>{article.title}</PageTitle>
						<p className="mt-4 text-zinc-800 md:text-lg max-w-2xl">{article.description}</p>
					</section>
					<section>
						<Content mdx={article.content ?? ''} type={article.sectionId} />
					</section>
					<Footer article={article} />
				</BlogLayout>
			)
		} else {
			return (
				<div className="w-full max-w-screen-xl mx-auto md:px-5 md:flex md:pt-16 isolate">
					<Sidebar
						sectionId={article.sectionId}
						categoryId={article.categoryId}
						articleId={article.id}
					/>
					<div className="fixed w-full h-12 border-b border-zinc-100 flex items-center justify-between px-5 bg-white/90 backdrop-blur md:hidden z-10">
						<MobileSidebar
							sectionId={article.sectionId}
							categoryId={article.categoryId}
							articleId={article.id}
						/>
						<SearchButton type="docs" layout="mobile" className="hidden sm:block -mr-2" />
					</div>
					<main className="relative shrink w-full max-w-3xl md:overflow-x-hidden px-5 md:pr-0 lg:pl-12 xl:pr-12 pt-24 md:pt-0">
						<Header article={article} />
						<Content mdx={article.content ?? ''} type={article.sectionId} />
						{article.sectionId === 'examples' && <Example article={article} />}
						<Footer article={article} />
					</main>
					<TableOfContents article={article} />
				</div>
			)
		}
	}

	notFound()
}

function BlogLayout({ children }: { children: ReactNode }) {
	return (
		<div className="w-full max-w-screen-xl mx-auto md:px-5 md:flex md:pt-16 isolate">
			<BlogSidebar />
			<div className="fixed w-full h-12 border-b border-zinc-100 flex items-center justify-between px-5 bg-white/90 backdrop-blur md:hidden z-10">
				<BlogMobileSidebar />
			</div>
			<main className="relative shrink w-full md:overflow-x-hidden px-5 md:pr-0 lg:pl-12 pt-24 md:pt-0">
				{children}
			</main>
		</div>
	)
}
