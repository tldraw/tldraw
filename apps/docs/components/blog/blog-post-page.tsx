import { BlogMobileSidebar } from '@/components/blog/blog-mobile-sidebar'
import { BlogPostHeader } from '@/components/blog/blog-post-header'
import { BlogSidebar } from '@/components/blog/blog-sidebar'
import { BlogTableOfContents } from '@/components/blog/blog-table-of-contents'
import { Content } from '@/components/content'
import { Article } from '@/types/content-types'
import { NewsletterSignup } from '../common/newsletter-signup'

export function BlogPostPage({ article }: { article: Article }) {
	return (
		<div className="w-full max-w-screen-xl mx-auto md:px-5 md:flex md:pt-16 isolate">
			<BlogSidebar>
				<NewsletterSignup size="small" />
			</BlogSidebar>
			<div className="fixed w-full h-12 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between px-5 bg-white dark:bg-zinc-950 backdrop-blur md:hidden z-10">
				<BlogMobileSidebar />
			</div>
			<main className="relative shrink w-full md:overflow-x-hidden px-5 md:pr-0 lg:pl-12 xl:pr-12 py-24 md:pt-0">
				<BlogPostHeader article={article} />
				<Content mdx={article.content ?? ''} type={article.sectionId} />
				<section className="mt-16 py-16 border-t border-zinc-100">
					<NewsletterSignup />
				</section>
			</main>
			<BlogTableOfContents article={article} />
		</div>
	)
}
