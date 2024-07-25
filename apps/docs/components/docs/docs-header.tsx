import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { Button } from '@/components/common/button'
import { PageTitle } from '@/components/common/page-title'
import { Article } from '@/types/content-types'
import { getDb } from '@/utils/ContentDatabase'
import { cn } from '@/utils/cn'

export const DocsHeader: React.FC<{ article: Article }> = async ({ article }) => {
	const db = await getDb()
	const section = await db.getSection(article.sectionId)
	const category = await db.getCategory(article.categoryId)
	return (
		<section
			className={cn(
				article.sectionId === 'reference'
					? ''
					: 'pb-6 mb-6 md:mb-12 md:pb-12 border-b border-zinc-100'
			)}
		>
			<Breadcrumbs section={section} category={category} className="mb-2" />
			<div className="flex flex-wrap justify-between gap-x-8 gap-y-3">
				<PageTitle>{article.title}</PageTitle>
				{article.sectionId === 'reference' && article.sourceUrl && (
					<Button
						href={article.sourceUrl}
						newTab
						caption="See source code"
						icon="github"
						size="sm"
						type="secondary"
						className="mt-1"
					/>
				)}
			</div>
		</section>
	)
}
