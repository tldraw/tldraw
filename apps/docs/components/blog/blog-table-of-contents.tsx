import { BlogAuthors } from '@/components/blog/blog-authors'
import { Aside } from '@/components/common/aside'
import { BackToTopButton } from '@/components/common/back-to-top-button'
import { ShareButton } from '@/components/common/share-button'
import { HeadingsMenu } from '@/components/navigation/headings-menu'
import { Article } from '@/types/content-types'
import { getDb } from '@/utils/ContentDatabase'

export async function BlogTableOfContents({ article }: { article: Article }) {
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
