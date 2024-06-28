import { Breadcrumbs } from '@/components/docs/breadcrumbs'
import { Article } from '@/types/content-types'
import { PageTitle } from '../content/page-title'

export const Header: React.FC<{ article: Article }> = async ({ article }) => {
	return (
		<section className="pb-12 mb-12 border-b border-zinc-100">
			<Breadcrumbs article={article} className="mb-2" />
			<PageTitle>{article.title}</PageTitle>
		</section>
	)
}
