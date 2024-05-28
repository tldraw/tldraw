import { Article } from '@/types/content-types'
import { Icon } from './Icon'

interface ArticleDetailsProps {
	article: Article
}

const ROOT_CONTENT_URL = `https://github.com/tldraw/tldraw/blob/main/apps/docs/content/`

export function ArticleDetails({ article: { sourceUrl, date } }: ArticleDetailsProps) {
	return (
		<div className="article__details">
			{sourceUrl && (
				<a className="article__details__edit" href={`${ROOT_CONTENT_URL}${sourceUrl}`}>
					<Icon icon="edit" />
					<span>Edit this page</span>
				</a>
			)}
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
