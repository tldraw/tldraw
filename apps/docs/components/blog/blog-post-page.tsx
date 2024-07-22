import { Article } from '@/types/content-types'
import { Content } from '../content'
import { Aside } from '../docs/aside'
import { BlogPostHeader } from './blog-post-header'
import { BlogTableOfContents } from './blog-table-of-contents'

export const BlogPostPage: React.FC<{
	article: Article
}> = ({ article }) => {
	return (
		<div className="w-full max-w-screen-xl mx-auto md:px-5 md:flex md:pt-16 isolate">
			<Aside className="hidden md:flex">Authors</Aside>
			<main className="relative shrink w-full md:overflow-x-hidden px-5 md:pr-0 lg:pl-12 pt-24 md:pt-0">
				<BlogPostHeader article={article} />
				<Content mdx={article.content ?? ''} type={article.sectionId} />
			</main>
			<BlogTableOfContents article={article} />
		</div>
	)
}
