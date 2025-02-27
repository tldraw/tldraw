import { BlogAuthors } from '@/components/blog/blog-authors'
import { Aside } from '@/components/common/aside'
import { BackToTopButton } from '@/components/common/back-to-top-button'
import { ShareButton } from '@/components/common/share-button'
import { HeadingsMenu } from '@/components/navigation/headings-menu'
import { Article } from '@/types/content-types'
import { db } from '@/utils/ContentDatabase'
import { ExtraSideBarButtons } from '../common/extra-sidebar-buttons'

export async function BlogTableOfContents({ article }: { article: Article }) {
	const headings = await db.getArticleHeadings(article.id)

	return (
		<Aside className="hidden xl:flex pl-12">
			<BlogAuthors article={article} />
			<HeadingsMenu headings={headings} />
			<ExtraSideBarButtons>
				<ShareButton url={`https://tldraw.dev${article.path}`} />
				<BackToTopButton />
			</ExtraSideBarButtons>
		</Aside>
	)
}
