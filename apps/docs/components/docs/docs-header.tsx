import { Button } from '@/components/common/button'
import { PageTitle } from '@/components/common/page-title'
import { Article } from '@/types/content-types'
import { cn } from '@/utils/cn'
import { version } from '@/version'

export async function DocsHeader({ article }: { article: Article }) {
	let sourceUrlWithVersionTag
	if (article.sectionId === 'reference' && article.sourceUrl) {
		sourceUrlWithVersionTag = article.sourceUrl.replace(
			'/tldraw/tldraw/blob/main',
			'/tldraw/tldraw/blob/v' + version
		)
	}

	return (
		<section
			className={cn(
				article.sectionId === 'reference'
					? ''
					: 'pb-6 mb-6 md:mb-8 md:pb-8 border-b border-zinc-100 dark:border-zinc-800'
			)}
		>
			<div className="flex flex-wrap justify-between gap-x-8 gap-y-3">
				<PageTitle>{article.title}</PageTitle>
				{sourceUrlWithVersionTag && (
					<Button
						id="see-source-code"
						href={sourceUrlWithVersionTag}
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
