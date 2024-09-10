import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { PageTitle } from '@/components/common/page-title'
import { ShareButton } from '@/components/common/share-button'
import { Image } from '@/components/content/image'
import { Article } from '@/types/content-types'
import { getDb } from '@/utils/ContentDatabase'
import { format } from 'date-fns'

export async function BlogPostHeader({ article }: { article: Article }) {
	const db = await getDb()
	const category = await db.getCategory(article.categoryId)
	const section = await db.getSection(article.sectionId)

	return (
		<section className="pb-6 mb-6 border-b md:mb-8 md:pb-8 border-zinc-100 dark:border-zinc-800">
			<Breadcrumbs section={section} category={category} className="mb-2" />
			<PageTitle>{article.title}</PageTitle>
			<p className="max-w-2xl mt-4 text-zinc-800 dark:text-zinc-200 md:text-lg">
				{article.description}
			</p>
			<div className="flex flex-col justify-between mt-4 mb-8 text-sm sm:flex-row gap-y-2">
				<span>{format(new Date(article.date ?? new Date()), 'MMMM dd, yyyy')}</span>
				<ShareButton url={`https://tldraw.dev${article.path}`} size="base" />
			</div>
			{article.hero && <Image src={article.hero} alt={article.title} width="100%" />}
		</section>
	)
}
