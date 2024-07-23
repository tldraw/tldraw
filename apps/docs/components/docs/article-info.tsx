import { Article } from '@/types/content-types'
import { format } from 'date-fns'
import Link from 'next/link'
import { BackToTopButton } from '../back-to-top-button'
import { GithubIcon } from '../icon/github'

const githubContentRoot = 'https://github.com/tldraw/tldraw/blob/main/apps/docs/content/'

export const ArticleInfo: React.FC<{ article: Article }> = ({ article }) => {
	return (
		<div className="shrink-0 text-xs flex flex-col gap-1">
			{article.date && <p>Last edited on {format(new Date(article.date), 'MMM dd, yyyy')}</p>}
			{article.sourceUrl && (
				<Link
					href={`${githubContentRoot}${article.sourceUrl}`}
					className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600"
				>
					<GithubIcon className="h-3.5" />
					<span>Edit this page on GitHub</span>
				</Link>
			)}
			<BackToTopButton />
		</div>
	)
}
