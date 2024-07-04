import { ArticleInfo } from '@/components/docs/article-info'
import { Aside } from '@/components/docs/aside'
import { FeedbackWidget } from '@/components/docs/feedback-widget'
import { HeadingsMenu } from '@/components/navigation/headings-menu'
import { Article } from '@/types/content-types'
import { getDb } from '@/utils/ContentDatabase'

export const TableOfContents: React.FC<{ article: Article }> = async ({ article }) => {
	const db = await getDb()
	const headings = await db.getArticleHeadings(article.id)

	return (
		<Aside className="hidden xl:flex pl-12">
			<HeadingsMenu headings={headings} />
			<ArticleInfo article={article} />
			<FeedbackWidget className="mb-12" />
		</Aside>
	)
}
