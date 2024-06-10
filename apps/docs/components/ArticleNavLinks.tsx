import { ArticleLinks } from '@/types/content-types'
import Link from 'next/link'
import { Icon } from './Icon'

interface ArticleNavLinksProps {
	links: ArticleLinks
}

export async function ArticleNavLinks({ links: { prev, next } }: ArticleNavLinksProps) {
	return (
		<div className="article__links">
			{prev && (
				<Link href={prev.path ?? '/'} className="article__links__link article__links__prev">
					<Icon icon="arrow-left" />
					<span>{prev.title}</span>
				</Link>
			)}
			{next && (
				<Link href={next.path ?? '/'} className="article__links__link article__links__next">
					<span>{next.title}</span>
					<Icon icon="arrow-right" />
				</Link>
			)}
		</div>
	)
}
