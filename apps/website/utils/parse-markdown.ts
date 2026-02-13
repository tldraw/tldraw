import GithubSlugger from 'github-slugger'
import type { Heading, InlineCode, Root, Text } from 'mdast'
import remarkParse from 'remark-parse'
import { unified } from 'unified'

export interface ParsedHeading {
	level: number
	title: string
	slug: string
}

function extractText(node: Heading): string {
	const parts: string[] = []
	for (const child of node.children) {
		if (child.type === 'text') {
			parts.push((child as Text).value)
		} else if (child.type === 'inlineCode') {
			parts.push((child as InlineCode).value)
		}
	}
	return parts.join('')
}

export function parseMarkdownHeadings(content: string): ParsedHeading[] {
	const tree = unified().use(remarkParse).parse(content) as Root
	const slugger = new GithubSlugger()
	const headings: ParsedHeading[] = []

	for (const node of tree.children) {
		if (node.type === 'heading') {
			const title = extractText(node as Heading)
			if (title) {
				headings.push({
					level: (node as Heading).depth,
					title,
					slug: slugger.slug(title),
				})
			}
		}
	}

	return headings
}
