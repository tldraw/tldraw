import { assert, assertExists } from '@tldraw/utils'
import GithubSlugger from 'github-slugger'
import { Nodes, Root } from 'mdast'
import { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx'
import { remark } from 'remark'
import remarkMdx from 'remark-mdx'

// Add nodes to mdast content.
declare module 'mdast' {
	interface BlockContentMap {
		/**
		 * MDX JSX element node, occurring in flow (block).
		 */
		mdxJsxFlowElement: MdxJsxFlowElement
	}

	interface PhrasingContentMap {
		/**
		 * MDX JSX element node, occurring in text (phrasing).
		 */
		mdxJsxTextElement: MdxJsxTextElement
	}

	interface RootContentMap {
		/**
		 * MDX JSX element node, occurring in flow (block).
		 */
		mdxJsxFlowElement: MdxJsxFlowElement
		/**
		 * MDX JSX element node, occurring in text (phrasing).
		 */
		mdxJsxTextElement: MdxJsxTextElement
	}
}

export interface ParsedHeading {
	level: number
	title: string
	slug: string
	contentText: string
	isInherited: boolean
}

export function parseHeadings(content: string): {
	headings: ParsedHeading[]
	initialContentText: string
} {
	const headings: Omit<ParsedHeading, 'slug'>[] = [
		{
			level: 0,
			title: '',
			contentText: '',
			isInherited: false,
		},
	]

	remark()
		.use(remarkMdx)
		.use(() => (tree: Root) => {
			interface State {
				isInHeading: boolean
				isInherited: boolean
			}

			function visitChildren(node: Nodes, state: State) {
				if ('children' in node) {
					for (const child of node.children) {
						visit(child, state)
					}
				}
			}

			function heading() {
				const currentHeading = headings[headings.length - 1]
				return currentHeading
			}

			function visit(node: Nodes, state: State) {
				switch (node.type) {
					case 'heading': {
						const { depth } = node

						headings.push({
							level: depth,
							title: '',
							contentText: '',
							isInherited: state.isInherited,
						})

						visitChildren(node, { ...state, isInHeading: true })

						break
					}

					case 'text':
					case 'inlineCode':
						if (state.isInHeading) {
							heading().title += node.value
						} else {
							heading().contentText += node.value
						}

						break

					case 'blockquote':
					case 'paragraph':
						assert(!state.isInHeading)
						if (!heading().contentText.endsWith('\n')) {
							heading().contentText += '\n'
						}
						visitChildren(node, state)
						break

					case 'code':
						// skip these entirely
						break

					case 'mdxJsxFlowElement':
					case 'mdxJsxTextElement': {
						const { name, attributes } = node

						if (
							// Remove table of contents
							(name === 'details' &&
								attributes.some(
									(attr) =>
										'name' in attr &&
										attr.name === 'className' &&
										attr.value === 'article__table-of-contents'
								)) ||
							// Remove ApiHeading
							name === 'ApiHeading'
						) {
							break
						}

						if (
							name === 'TitleWithSourceLink' &&
							attributes.some(
								(attr) => 'name' in attr && attr.name === 'inherited' && attr.value !== null
							)
						) {
							visitChildren(node, { ...state, isInherited: true })
							break
						}

						visitChildren(node, state)
						break
					}

					default:
						visitChildren(node, state)
				}
			}

			visit(tree, { isInHeading: false, isInherited: false })
		})
		.processSync(content)

	const initial = assertExists(headings.shift())
	const slugs = new GithubSlugger()

	return {
		initialContentText: initial.contentText,
		headings: headings.map((heading) => ({ ...heading, slug: slugs.slug(heading.title, true) })),
	}
}

export function markdownToPlainText(content: string): string {
	let text = ''

	remark()
		.use(remarkMdx)
		.use(() => (tree: Root) => {
			function visitChildren(node: Nodes) {
				if ('children' in node) {
					for (const child of node.children) {
						visit(child)
					}
				}
			}

			function visit(node: Nodes) {
				switch (node.type) {
					case 'text':
					case 'inlineCode':
						text += node.value

						break

					case 'blockquote':
					case 'heading':
					case 'paragraph':
						if (!text.endsWith('\n')) {
							text += '\n'
						}
						visitChildren(node)
						break

					case 'code':
						// skip these entirely
						break

					case 'mdxJsxFlowElement':
					case 'mdxJsxTextElement': {
						const { name, attributes } = node

						if (
							// Remove table of contents
							(name === 'details' &&
								attributes.some(
									(attr) =>
										'name' in attr &&
										attr.name === 'className' &&
										attr.value === 'article__table-of-contents'
								)) ||
							// Remove ApiHeading
							name === 'ApiHeading'
						) {
							break
						}

						visitChildren(node)
						break
					}

					default:
						visitChildren(node)
				}
			}

			visit(tree)
		})
		.processSync(content)

	return text
}
