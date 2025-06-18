import { BlogAuthors } from '@/components/blog/blog-authors'
import { BackToTopButton } from '@/components/common/back-to-top-button'
import { Navigation } from '@/components/common/navigation'
import { ShareButton } from '@/components/common/share-button'
import { HeadingsMenu } from '@/components/navigation/headings-menu'
import { Article } from '@/types/content-types'
import { db } from '@/utils/ContentDatabase'
import { ExtraSideBarButtons } from '../common/extra-sidebar-buttons'

export async function BlogTableOfContents({ article }: { article: Article }) {
	const headings = await db.getArticleHeadings(article.id)

	return (
		<Navigation className="hidden xl:flex pl-12">
			<BlogAuthors article={article} />
			<HeadingsMenu headings={headings} />
			<ShareButton
				url={`https://tldraw.dev${article.path}/?utm_source=blog&utm_medium=referral&utm_campaign=share`}
			/>
			<ExtraSideBarButtons>
				<BackToTopButton />
			</ExtraSideBarButtons>
		</Navigation>
	)
}
