import { renderMarkdown } from '@/utils/render-markdown'

export async function Markdown({ content, className }: { content: string; className?: string }) {
	const html = await renderMarkdown(content)
	return (
		<div
			className={`prose prose-lg dark:prose-invert max-w-none ${className ?? ''}`}
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	)
}
