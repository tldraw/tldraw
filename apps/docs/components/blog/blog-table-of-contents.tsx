import { Aside } from '@/components/docs/aside'
import { HeadingsMenu } from '@/components/navigation/headings-menu'
import { Article } from '@/types/content-types'
import { getDb } from '@/utils/ContentDatabase'
import { BackToTopButton } from '../back-to-top-button'
import { BlogAuthors } from './blog-authors'
import { ShareButton } from './share-button'

export const BlogTableOfContents: React.FC<{ article: Article }> = async ({ article }) => {
	const db = await getDb()
	const headings = await db.getArticleHeadings(article.id)

	return (
		<Aside className="hidden xl:flex pl-12">
			<BlogAuthors article={article} />
			<HeadingsMenu headings={headings} />
			<div className="mb-12 shrink-0 text-xs flex flex-col gap-1">
				<ShareButton url={`https://tldraw.dev${article.path}`} />
				<BackToTopButton />
			</div>
		</Aside>
	)
}
