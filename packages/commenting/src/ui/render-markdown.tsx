import { Fragment, ReactNode } from 'react'

/**
 * Minimal markdown for comment bodies: paragraphs, line breaks, bullet lists, and
 * inline **bold**, *italic*, `code`, and [links](url). Not a full CommonMark parser —
 * just the markdown people actually write in comments. Renders React elements only —
 * never raw HTML — so there's no HTML-injection surface.
 * @public
 */
export function renderMarkdown(text: string): ReactNode {
	return text
		.trim()
		.split(/\n{2,}/)
		.map((block, i) => {
			const lines = block.split('\n')
			if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
				return (
					<ul key={i} className="md-list">
						{lines.map((line, j) => (
							<li key={j}>{renderInline(line.replace(/^\s*[-*]\s+/, ''))}</li>
						))}
					</ul>
				)
			}
			return (
				<p key={i} className="md-p">
					{lines.map((line, j) => (
						<Fragment key={j}>
							{j > 0 && <br />}
							{renderInline(line)}
						</Fragment>
					))}
				</p>
			)
		})
}

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)]+\))/g

function renderInline(text: string): ReactNode {
	const out: ReactNode[] = []
	let last = 0
	let key = 0
	for (const match of text.matchAll(INLINE)) {
		const index = match.index ?? 0
		if (index > last) out.push(text.slice(last, index))
		out.push(renderToken(match[0], key++))
		last = index + match[0].length
	}
	if (last < text.length) out.push(text.slice(last))
	return out
}

function renderToken(token: string, key: number): ReactNode {
	if (token.startsWith('**')) return <strong key={key}>{token.slice(2, -2)}</strong>
	if (token.startsWith('`'))
		return (
			<code key={key} className="md-code">
				{token.slice(1, -1)}
			</code>
		)
	if (token.startsWith('[')) {
		const link = /\[([^\]]+)\]\(([^)]+)\)/.exec(token)
		if (!link) return token
		return (
			<a key={key} href={link[2]} target="_blank" rel="noreferrer">
				{link[1]}
			</a>
		)
	}
	return <em key={key}>{token.slice(1, -1)}</em>
}
