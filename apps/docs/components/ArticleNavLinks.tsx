import { ArticleLinks } from '@/types/content-types'
import Link from 'next/link'
import { Icon } from './Icon'

type ArticleNavLinksProps = {
	links: ArticleLinks
}

export function ArticleNavLinks({ links: { prev, next } }: ArticleNavLinksProps) {
	return (
		<div className="article__links">
			{prev && (
				<Link
					href={`/${prev.sectionId}/${prev.categoryId}/${prev.id}`}
					className="article__links__link article__links__prev"
				>
					<Icon icon="arrow-left" />
					<span>{prev.title}</span>
				</Link>
			)}
			{next && (
				<Link
					href={`/${next.sectionId}/${next.categoryId}/${next.id}`}
					className="article__links__link article__links__next"
				>
					<span>{next.title}</span>
					<Icon icon="arrow-right" />
				</Link>
			)}
		</div>
	)
}
