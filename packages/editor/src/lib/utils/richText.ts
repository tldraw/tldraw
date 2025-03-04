import { getSchema, JSONContent, Editor as TTEditor } from '@tiptap/core'
import { Node } from '@tiptap/pm/model'
import { EditorProviderProps } from '@tiptap/react'
import { TLRichText } from '@tldraw/tlschema'
import { assert } from '@tldraw/utils'
import { Editor } from '../editor/Editor'
import { TLFontFace } from '../editor/managers/FontManager'

/**
 * This is the TipTap editor! Docs are {@link https://tiptap.dev/docs}.
 *
 * @public
 */
export type TiptapEditor = TTEditor

/**
 * A TipTap node. See {@link https://tiptap.dev/docs}.
 * @public
 */
export type TiptapNode = Node

/** @public */
export interface TLTextOptions {
	tipTapConfig?: EditorProviderProps
	addFontsFromNode?: RichTextFontVisitor
}

/** @public */
export interface RichTextFontVisitorState {
	readonly family: string
	readonly weight: string
	readonly style: string
}

/** @public */
export type RichTextFontVisitor = (
	node: TiptapNode,
	state: RichTextFontVisitorState,
	addFont: (font: TLFontFace) => void
) => RichTextFontVisitorState

/** @public */
export function getFontsFromRichText(
	editor: Editor,
	richText: TLRichText,
	initialState: RichTextFontVisitorState
) {
	const { tipTapConfig, addFontsFromNode } = editor.getTextOptions()
	assert(tipTapConfig, 'textOptions.tipTapConfig must be set to use rich text')
	assert(addFontsFromNode, 'textOptions.addFontsFromNode must be set to use rich text')

	const schema = getSchema(tipTapConfig.extensions ?? [])
	const rootNode = Node.fromJSON(schema, richText as JSONContent)

	const fonts = new Set<TLFontFace>()

	function addFont(font: TLFontFace) {
		fonts.add(font)
	}

	function visit(node: TiptapNode, state: RichTextFontVisitorState) {
		state = addFontsFromNode!(node, state, addFont)

		for (const child of node.children) {
			visit(child, state)
		}
	}

	visit(rootNode, initialState)

	return Array.from(fonts)
}
