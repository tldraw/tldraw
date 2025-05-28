import { Navigation } from '@/components/common/navigation'
import { DocsArticleInfo } from '@/components/docs/docs-article-info'
import { DocsFeedbackWidget } from '@/components/docs/docs-feedback-widget'
import { HeadingsMenu } from '@/components/navigation/headings-menu'
import { Article } from '@/types/content-types'
import { db } from '@/utils/ContentDatabase'

export async function DocsTableOfContents({ article }: { article: Article }) {
	const headings = await db.getArticleHeadings(article.id)

	return (
		<Navigation className="hidden xl:flex pl-12">
			<HeadingsMenu headings={headings} />
			<DocsArticleInfo article={article} />
			<DocsFeedbackWidget className="mb-12" />
		</Navigation>
	)
}
