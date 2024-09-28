import { BlogMobileSidebar } from '@/components/blog/blog-mobile-sidebar'
import { BlogPostPreview } from '@/components/blog/blog-post-preview'
import { BlogSidebar } from '@/components/blog/blog-sidebar'
import { PageTitle } from '@/components/common/page-title'
import { Article } from '@/types/content-types'
import { NewsletterSignup } from '../common/newsletter-signup'
import { SearchButton } from '../search/SearchButton'

export function BlogCategoryPage({
	title,
	description,
	articles,
}: {
	title: string
	description: string | null
	articles: Article[]
}) {
	return (
		<div className="w-full max-w-screen-xl mx-auto md:px-5 md:flex md:pt-8 isolate">
			<BlogSidebar>
				<NewsletterSignup size="small" />
			</BlogSidebar>
			<div className="fixed z-10 flex items-center justify-between w-full h-12 px-5 bg-white border-b border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 backdrop-blur md:hidden">
				<BlogMobileSidebar />
				<SearchButton type="blog" layout="mobile" className="hidden -mr-2 sm:block" />
			</div>
			<main className="relative w-full px-5 py-24 shrink md:overflow-x-hidden md:pr-0 lg:pl-12 md:pt-0">
				<section className="pb-6 mb-6 border-b md:mb-8 md:pb-8 border-zinc-100 dark:border-zinc-800">
					<PageTitle>{title}</PageTitle>
					{description && (
						<p className="max-w-2xl mt-4 text-lg text-zinc-800 dark:text-zinc-200">{description}</p>
					)}
				</section>
				<section className="space-y-12">
					{articles
						.sort((a, b) => new Date(b.date ?? '').getTime() - new Date(a.date ?? '').getTime())
						.map((article, index) => (
							<BlogPostPreview key={index} article={article} />
						))}
				</section>
				<section className="py-16 mt-16 border-t border-zinc-100 dark:border-zinc-800">
					<NewsletterSignup />
				</section>
			</main>
		</div>
	)
}
