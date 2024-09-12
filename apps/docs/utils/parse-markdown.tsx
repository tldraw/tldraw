import { assert, assertExists } from '@tldraw/utils'
import GithubSlugger from 'github-slugger'
import { Nodes, Root } from 'mdast'
import { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx'
import { remark } from 'remark'
import remarkMdx from 'remark-mdx'
import { TABLE_OF_CONTENTS_CLASSNAME } from './config'

const BREAK = '\n\n'

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

/**
 * Walk the MDX AST of `content` and extract headings & their (plain text) content as we go.
 *
 * This returns an array of heading objects containing the heading info, and the text below it
 * (before the next heading). It also returns the initial content text before the first heading.
 *
 * Heading extraction should be reliable, but content extraction is pretty best-effort. It's useful
 * for a search index (which is what we use it for!), but might not be a perfect representation of
 * everything on the page.
 */
export function parseMarkdown(
	content: string,
	debugContext: string
): {
	headings: ParsedHeading[]
	allContentText: string
	initialContentText: string
} {
	// the headings found so far. we start with a dummy heading at the beginning to hold the initial
	// content text, but we'll remove it at the end.
	const headings: Omit<ParsedHeading, 'slug'>[] = [
		{
			level: 0,
			title: '',
			contentText: '',
			isInherited: false,
		},
	]

	// all the text we've seen so far, including headings
	let allContentText = ''

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

	function currentHeading() {
		const currentHeading = headings[headings.length - 1]
		return currentHeading
	}

	function addText(text: string, state: State) {
		if (state.isInHeading) {
			currentHeading().title += text
		} else {
			currentHeading().contentText += text
		}
		allContentText += text
	}

	// add a paragraph break if needed:
	function breakText(state: State) {
		assert(!state.isInHeading)
		if (!currentHeading().contentText.endsWith(BREAK)) {
			currentHeading().contentText += BREAK
		}
		if (!allContentText.endsWith(BREAK)) {
			allContentText += BREAK
		}
	}

	function visit(node: Nodes, state: State) {
		switch (node.type) {
			case 'heading': {
				const { depth } = node

				allContentText += BREAK
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
				addText(node.value, state)
				break

			case 'blockquote':
			case 'paragraph':
				breakText(state)
				visitChildren(node, state)
				break

			case 'code':
				// skip these entirely
				break

			case 'mdxJsxFlowElement':
			case 'mdxJsxTextElement': {
				const { name, attributes } = node

				if (node.type === 'mdxJsxFlowElement') {
					breakText(state)
				}

				if (
					// Remove table of contents
					name === 'details' &&
					attributes.some(
						(attr) =>
							'name' in attr &&
							attr.name === 'className' &&
							attr.value === TABLE_OF_CONTENTS_CLASSNAME
					)
				) {
					break
				}

				if (name === 'ApiMemberTitle') {
					// each ApiMemberTitle, which is used for the title of everything in the API
					// reference docs, should have an `inherited` attribute:
					const inheritedAttr = attributes.find(
						(attr) => attr.type === 'mdxJsxAttribute' && attr.name === 'inherited'
					)
					if (!inheritedAttr) {
						throw new Error(`ApiMemberTitle missing inherited attribute (in ${debugContext})`)
					}

					if (
						!inheritedAttr.value ||
						typeof inheritedAttr.value !== 'object' ||
						inheritedAttr.type !== 'mdxJsxAttribute'
					) {
						throw new Error(
							`Unknown format for ApiMemberTitle inherited attribute (in ${debugContext})`
						)
					}

					// if it doesn't have the value `null`, then it's inherited. otherwise, we can
					// visit its children normally.
					if (inheritedAttr.value.value !== 'null') {
						visitChildren(node, { ...state, isInherited: true })
						break
					}
				}

				if (name === 'ParametersTableDescription') {
					addText('(', state)
				}

				visitChildren(node, state)

				if (name === 'ApiHeading') {
					addText(':', state)
					breakText(state)
				}

				if (name === 'ParametersTableDescription') {
					addText(')', state)
				}

				if (name === 'ParametersTableRow') {
					addText(',', state)
				}

				if (name === 'ParametersTable') {
					breakText(state)
					addText('.', state)
				}

				break
			}

			default:
				visitChildren(node, state)
		}
	}

	remark()
		.use(remarkMdx)
		.use(() => (tree: Root) => {
			visit(tree, { isInHeading: false, isInherited: false })
		})
		.processSync(content)

	const initial = assertExists(headings.shift())
	const slugs = new GithubSlugger()

	return {
		initialContentText: postprocessText(initial.contentText),
		allContentText: postprocessText(allContentText),
		headings: headings.map((heading) => ({
			...heading,
			slug: slugs.slug(heading.title, true),
			contentText: postprocessText(heading.contentText),
		})),
	}
}

function postprocessText(text: string) {
	return (
		text
			// remove trailing/leading whitespace in each line:
			.replace(/^\s+/gm, '')
			.replace(/\s+$/gm, '')
			// remove empty lines:
			.replace(/^\s*$/gm, '')
			// place on a single line:
			.replace(/\s+/g, ' ')
			// empty brackets:
			.replace(/\( \)/g, '')
			// bracket spacing:
			.replace(/\( /g, '(')
			.replace(/ \)/g, ')')
			// comma leading space:
			.replace(/\s+,/g, ',')
			// comma + period:
			.replace(/,\s*\./g, '.')
			// blank Returns:
			.replace(/Returns:$/, '')
			// weird punctuation:
			.replace(/\.\),/g, '),')
	)
}
