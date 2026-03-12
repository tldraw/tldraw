import { Button } from '@/components/common/button'
import { DocsArticleInfo } from '@/components/docs/docs-article-info'
import { DocsFeedbackWidget } from '@/components/docs/docs-feedback-widget'
import { HeadingsMenu } from '@/components/navigation/headings-menu'
import type { Article } from '@/types/content-types'
import { db } from '@/utils/ContentDatabase'

export async function DocsStarterSidebar({ article }: { article: Article }) {
	const headings = await db.getArticleHeadings(article.id)

	return (
		<nav className="lg:w-60 flex flex-col xl:pl-5 sticky top-24 shrink-0 xl:order-last xl:h-[calc(100vh-6rem)]">
			{article.githubLink && (
				<div className="mb-12 flex xl:flex-col gap-2">
					<Button
						icon="github"
						type="secondary"
						href={article.githubLink}
						newTab={true}
						caption="View on GitHub"
					></Button>
				</div>
			)}
			<div className="hidden xl:flex flex-col">
				<HeadingsMenu headings={headings} />
				<DocsArticleInfo article={article} />
				<DocsFeedbackWidget className="mb-12" />
			</div>
		</nav>
	)
}
