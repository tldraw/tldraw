import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

/**
 * Render a markdown string to an HTML string.
 *
 * The result is intended to be wrapped in a `<div className="prose ...">` and
 * styled by the Tailwind typography plugin.
 */
export async function renderMarkdown(content: string): Promise<string> {
	const result = await unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeStringify, { allowDangerousHtml: true })
		.process(content)

	return String(result)
}
