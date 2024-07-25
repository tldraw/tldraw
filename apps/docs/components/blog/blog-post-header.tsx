import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { PageTitle } from '@/components/common/page-title'
import { ShareButton } from '@/components/common/share-button'
import { Image } from '@/components/content/image'
import { Article } from '@/types/content-types'
import { getDb } from '@/utils/ContentDatabase'
import { format } from 'date-fns'

export const BlogPostHeader: React.FC<{ article: Article }> = async ({ article }) => {
	const db = await getDb()
	const category = await db.getCategory(article.categoryId)
	const section = await db.getSection(article.sectionId)

	return (
		<section className="pb-6 mb-6 md:mb-12 md:pb-12 border-b border-zinc-100">
			<Breadcrumbs section={section} category={category} className="mb-2" />
			<PageTitle>{article.title}</PageTitle>
			<p className="mt-4 text-zinc-800 md:text-lg max-w-2xl">{article.description}</p>
			<div className="text-sm mt-4 mb-8 flex flex-col sm:flex-row gap-y-2 justify-between">
				<span>{format(new Date(article.date ?? new Date()), 'MMMM dd, yyyy')}</span>
				<ShareButton url={`https://tldraw.dev${article.path}`} size="base" />
			</div>
			{article.hero && <Image src={article.hero} alt={article.title} width="100%" />}
		</section>
	)
}
