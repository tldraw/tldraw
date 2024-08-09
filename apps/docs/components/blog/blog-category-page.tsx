import { BlogMobileSidebar } from '@/components/blog/blog-mobile-sidebar'
import { BlogPostPreview } from '@/components/blog/blog-post-preview'
import { BlogSidebar } from '@/components/blog/blog-sidebar'
import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { PageTitle } from '@/components/common/page-title'
import { Article, Section } from '@/types/content-types'
import { SearchButton } from '../search/button'

export const BlogCategoryPage: React.FC<{
	title: string
	description: string | null
	section: Section
	articles: Article[]
}> = ({ title, description, section, articles }) => {
	return (
		<div className="w-full max-w-screen-xl mx-auto md:px-5 md:flex md:pt-16 isolate">
			<BlogSidebar>{/* <NewsletterSignup size="small" /> */}</BlogSidebar>
			<div className="fixed w-full h-12 border-b border-zinc-100 flex items-center justify-between px-5 bg-white/90 backdrop-blur md:hidden z-10">
				<BlogMobileSidebar />
				<SearchButton type="blog" layout="mobile" className="hidden sm:block -mr-2" />
			</div>
			<main className="relative shrink w-full md:overflow-x-hidden px-5 md:pr-0 lg:pl-12 py-24 md:pt-0">
				<section className="pb-6 mb-6 md:mb-12 md:pb-12 border-b border-zinc-100">
					<Breadcrumbs section={section} className="mb-2" />
					<PageTitle>{title}</PageTitle>
					{description && <p className="mt-4 text-zinc-800 text-lg max-w-2xl">{description}</p>}
				</section>
				<section className="space-y-12">
					{articles
						.sort((a, b) => new Date(b.date ?? '').getTime() - new Date(a.date ?? '').getTime())
						.map((article, index) => (
							<BlogPostPreview key={index} article={article} />
						))}
				</section>
				{/* <section className="mt-16 py-16 border-t border-zinc-100">
					<NewsletterSignup />
				</section> */}
			</main>
		</div>
	)
}
