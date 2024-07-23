import { Article } from '@/types/content-types'
import { PageTitle } from '../page-title'
import { BlogBreadcrumbs } from './blog-breadcrumbs'
import { BlogMobileSidebar } from './blog-mobile-sidebar'
import { BlogPostPreview } from './blog-post-preview'
import { BlogSidebar } from './blog-sidebar'
import { NewsletterSignup } from './newsletter-signup'

export const BlogCategoryPage: React.FC<{
	title: string
	description: string
	articles: Article[]
}> = ({ title, description, articles }) => {
	return (
		<div className="w-full max-w-screen-xl mx-auto md:px-5 md:flex md:pt-16 isolate">
			<BlogSidebar />
			<div className="fixed w-full h-12 border-b border-zinc-100 flex items-center justify-between px-5 bg-white/90 backdrop-blur md:hidden z-10">
				<BlogMobileSidebar />
			</div>
			<main className="relative shrink w-full md:overflow-x-hidden px-5 md:pr-0 lg:pl-12 pt-24 md:pt-0">
				<section className="pb-6 mb-6 md:mb-12 md:pb-12 border-b border-zinc-100">
					<BlogBreadcrumbs className="mb-2" />
					<PageTitle>{title}</PageTitle>
					<p className="mt-4 text-zinc-800 text-lg max-w-2xl">{description}</p>
				</section>
				<section className="space-y-12">
					{articles
						.sort((a, b) => new Date(b.date ?? '').getTime() - new Date(a.date ?? '').getTime())
						.map((article, index) => (
							<BlogPostPreview key={index} article={article} />
						))}
				</section>
				<section className="mt-16 py-16 border-t border-zinc-100">
					<NewsletterSignup />
				</section>
			</main>
		</div>
	)
}
