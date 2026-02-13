import { Button } from '@/components/common/button'
import { PageTitle } from '@/components/common/page-title'
import { Article } from '@/types/content-types'
import { cn } from '@/utils/cn'
import { version } from '@/version'
import { CopyMarkdownButton } from './copy-markdown-button'

function getFileExtension(filename: string): string {
	const ext = filename.split('.').pop()?.toLowerCase() ?? ''
	switch (ext) {
		case 'tsx':
		case 'ts':
			return 'tsx'
		case 'jsx':
		case 'js':
			return 'jsx'
		case 'css':
			return 'css'
		case 'svg':
			return 'xml'
		default:
			return ext
	}
}

function buildFullMarkdown(article: Article): string {
	const parts: string[] = []

	// Add the article content
	if (article.content) {
		parts.push(article.content.trim())
	}

	// Collect all code files
	const codeFiles: Array<{ name: string; content: string }> = []

	// Add the main component code
	if (article.componentCode && article.componentCodeFilename) {
		codeFiles.push({ name: article.componentCodeFilename, content: article.componentCode })
	}

	// Add additional code files
	if (article.componentCodeFiles) {
		const files = JSON.parse(article.componentCodeFiles) as Record<string, string>
		for (const [fileName, content] of Object.entries(files)) {
			codeFiles.push({ name: fileName, content })
		}
	}

	// Add all code files with filename comments
	for (const file of codeFiles) {
		const ext = getFileExtension(file.name)
		parts.push('\n\n```' + ext + '\n// ' + file.name + '\n\n' + file.content.trim() + '\n```')
	}

	return parts.join('')
}

export async function DocsHeader({ article }: { article: Article }) {
	let sourceUrlWithVersionTag
	if (article.sectionId === 'reference' && article.sourceUrl) {
		sourceUrlWithVersionTag = article.sourceUrl.replace(
			'/tldraw/tldraw/blob/main',
			'/tldraw/tldraw/blob/v' + version
		)
	}

	const markdown = buildFullMarkdown(article)

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
				<div className="flex flex-wrap items-center gap-2 mt-1">
					{markdown && <CopyMarkdownButton markdown={markdown} />}
					{sourceUrlWithVersionTag && (
						<Button
							id="see-source-code"
							href={sourceUrlWithVersionTag}
							newTab
							caption="See source code"
							icon="github"
							size="sm"
							type="secondary"
						/>
					)}
				</div>
			</div>
		</section>
	)
}
