import { Article } from '@/types/content-types'
import { Content } from '../content'
import { Aside } from '../docs/aside'
import { BlogAuthors } from './blog-authors'
import { BlogPostHeader } from './blog-post-header'
import { BlogTableOfContents } from './blog-table-of-contents'
import { NewsletterSignup } from './newsletter-signup'

export const BlogPostPage: React.FC<{
	article: Article
}> = ({ article }) => {
	return (
		<div className="w-full max-w-screen-xl mx-auto md:px-5 md:flex md:pt-16 isolate">
			<Aside className="hidden md:flex pr-12">
				<BlogAuthors article={article} />
				<NewsletterSignup size="small" />
			</Aside>
			<main className="relative shrink w-full md:overflow-x-hidden px-5 md:pr-0 lg:pl-12 pt-24 md:pt-0">
				<BlogPostHeader article={article} />
				<Content mdx={article.content ?? ''} type={article.sectionId} />
				<div className="mt-16 py-16 border-t border-zinc-100">
					<NewsletterSignup />
				</div>
			</main>
			<BlogTableOfContents article={article} />
		</div>
	)
}
