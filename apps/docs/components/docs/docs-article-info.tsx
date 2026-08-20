import { format } from 'date-fns'
import Link from 'next/link'
import { BackToTopButton } from '@/components/common/back-to-top-button'
import { GithubIcon } from '@/components/common/icon/github'
import { Article } from '@/types/content-types'

const githubContentRoot = 'https://github.com/tldraw/tldraw/blob/main/apps/docs/content/'

export function DocsArticleInfo({ article }: { article: Article }) {
	if (article.sectionId === 'reference') {
		// This article is actually source code and we link to it already in 'See source code'.
		// (Not keyed on `authorId === 'api'`: that's also the default for any article without an
		// `author:` frontmatter key.)
		return null
	}

	return (
		<div className="shrink-0 text-xs flex flex-col gap-2 mb-12">
			{article.date && <p>Last edited on {format(new Date(article.date), 'MMM dd, yyyy')}</p>}
			{article.sourceUrl && (
				<Link
					href={`${githubContentRoot}${article.sourceUrl}`}
					className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
				>
					<GithubIcon className="h-3.5" />
					<span>Edit this page on GitHub</span>
				</Link>
			)}
			<BackToTopButton />
		</div>
	)
}
