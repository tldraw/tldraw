import { Aside } from '@/components/docs/aside'
import { HeadingsMenu } from '@/components/navigation/headings-menu'
import { Article } from '@/types/content-types'
import { getDb } from '@/utils/ContentDatabase'
import { ShareButton } from './share-button'

export const BlogTableOfContents: React.FC<{ article: Article }> = async ({ article }) => {
	const db = await getDb()
	const headings = await db.getArticleHeadings(article.id)

	return (
		<Aside className="hidden xl:flex pl-12">
			<HeadingsMenu headings={headings} />
			<ShareButton url={`https://tldraw.dev${article.path}`} />
		</Aside>
	)
}
