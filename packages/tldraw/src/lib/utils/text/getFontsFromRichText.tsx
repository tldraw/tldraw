import { Extensions, getSchema, JSONContent } from '@tiptap/core'
import { Node } from '@tiptap/pm/model'
import { TLFontFace, TLRichText } from '@tldraw/editor'
import { DefaultFontFamilies } from '../../shapes/shared/defaultFonts'

export interface RichTextFontState {
	readonly family: string
	readonly weight: string
	readonly style: string
	readonly [key: string]: any
}

export type RichTextFontVisitor = (
	node: Node,
	state: RichTextFontState,
	addFont: (font: TLFontFace) => void
) => RichTextFontState

export function getFontsFromRichText(
	richText: TLRichText,
	extensions: Extensions,
	initialState: RichTextFontState,
	...visitors: RichTextFontVisitor[]
) {
	const schema = getSchema(extensions)
	const rootNode = Node.fromJSON(schema, richText as JSONContent)

	const fonts = new Set<TLFontFace>()

	function addFont(font: TLFontFace) {
		fonts.add(font)
	}

	function visit(node: Node, state: RichTextFontState) {
		for (const visitor of visitors) {
			state = visitor(node, state, addFont)
		}

		for (const child of node.children) {
			visit(child, state)
		}
	}

	visit(rootNode, initialState)

	return Array.from(fonts)
}

export function defaultRichTextFontVisitor(
	node: Node,
	state: RichTextFontState,
	addFont: (font: TLFontFace) => void
) {
	for (const mark of node.marks) {
		if (mark.type.name === 'bold' && state.weight !== '700') {
			state = { ...state, weight: '700' }
		}
		if (mark.type.name === 'italic' && state.style !== 'italic') {
			state = { ...state, style: 'italic' }
		}
		if (mark.type.name === 'code' && state.family !== 'tldraw_mono') {
			state = { ...state, family: 'tldraw_mono' }
		}
	}

	const font: TLFontFace | undefined = (DefaultFontFamilies as any)[state.family]?.[state.style]?.[
		state.weight
	]

	if (font) {
		addFont(font)
	}

	return state
}
