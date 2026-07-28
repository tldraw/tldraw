import { getSchema } from '@tiptap/core'
import { Fragment, Node, Slice } from '@tiptap/pm/model'
import { describe, expect, it } from 'vitest'
import { commentTipTapExtensions, unwrapSingleBlockPaste } from './comment-extensions'

const schema = getSchema(commentTipTapExtensions)

function paragraph(text: string) {
	return schema.nodes.paragraph.create(null, schema.text(text))
}

function list(...items: string[]) {
	return schema.nodes.bulletList.create(
		null,
		items.map((text) => schema.nodes.listItem.create(null, paragraph(text)))
	)
}

/** How ProseMirror puts whole blocks on the clipboard: a slice that is closed at both ends. */
function closedSlice(...nodes: Node[]) {
	return new Slice(Fragment.from(nodes), 0, 0)
}

describe('unwrapSingleBlockPaste', () => {
	it('unwraps a single closed paragraph into its inline content', () => {
		const result = unwrapSingleBlockPaste(closedSlice(paragraph('hello')))
		expect(result.toJSON()).toEqual({ content: [{ type: 'text', text: 'hello' }] })
	})

	it('leaves a slice that is already open alone', () => {
		// what a shift+arrow selection copies: open at both ends, so it already pastes inline
		const slice = new Slice(Fragment.from(paragraph('hello')), 1, 1)
		expect(unwrapSingleBlockPaste(slice)).toBe(slice)
	})

	it('leaves a multi-block slice alone', () => {
		const slice = closedSlice(paragraph('hello'), paragraph('world'))
		expect(unwrapSingleBlockPaste(slice)).toBe(slice)
	})

	it('leaves list structure alone', () => {
		const slice = closedSlice(list('one', 'two'))
		expect(unwrapSingleBlockPaste(slice)).toBe(slice)
	})

	it('leaves an empty slice alone', () => {
		expect(unwrapSingleBlockPaste(Slice.empty)).toBe(Slice.empty)
	})
})
