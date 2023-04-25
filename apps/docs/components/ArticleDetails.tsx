import { Article } from '@/types/content-types'
import { Icon } from './Icon'

type ArticleDetailsProps = {
	article: Article
}

export function ArticleDetails({ article: { sourceUrl, date } }: ArticleDetailsProps) {
	return (
		<div className="article__details">
			<a className="article__details__edit" href={sourceUrl}>
				<Icon icon="edit" />
				<span>Edit this page</span>
			</a>
			{date && (
				<div className="article__details__timestamp">
					Last edited on{' '}
					{Intl.DateTimeFormat('en-gb', {
						year: 'numeric',
						month: 'long',
						day: 'numeric',
					}).format(new Date(date))}
				</div>
			)}
		</div>
	)
}
