import { createShapeId, DefaultBorderStyle, TLBookmarkShape, TLEmbedShape } from '@tldraw/editor'
import { createEmptyBookmarkShape } from '../lib/defaultExternalContentHandlers'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

afterEach(() => {
	editor?.dispose()
})

describe('media border defaults', () => {
	it('defaults a new bookmark to the shadow border even when the shared border style is something else', () => {
		editor.setStyleForNextShapes(DefaultBorderStyle, 'lined')
		const shape = createEmptyBookmarkShape(editor, 'https://example.com', { x: 0, y: 0 })
		expect(shape.props.border).toBe('shadow')
	})

	it('keeps an explicitly chosen border when a bookmark is duplicated', () => {
		const id = createShapeId()
		editor.createShapes<TLBookmarkShape>([
			{ id, type: 'bookmark', x: 0, y: 0, props: { url: 'https://example.com', border: 'none' } },
		])
		expect(editor.getShape<TLBookmarkShape>(id)!.props.border).toBe('none')

		editor.select(id)
		editor.duplicateShapes(editor.getSelectedShapeIds())
		const duplicate = editor
			.getSelectedShapes()
			.find((s): s is TLBookmarkShape => s.type === 'bookmark' && s.id !== id)!
		expect(duplicate.props.border).toBe('none')
	})

	it('keeps an explicitly chosen border when an embed is duplicated', () => {
		const id = createShapeId()
		editor.createShapes<TLEmbedShape>([
			{ id, type: 'embed', x: 0, y: 0, props: { url: 'https://example.com', border: 'lined' } },
		])
		expect(editor.getShape<TLEmbedShape>(id)!.props.border).toBe('lined')

		editor.select(id)
		editor.duplicateShapes(editor.getSelectedShapeIds())
		const duplicate = editor
			.getSelectedShapes()
			.find((s): s is TLEmbedShape => s.type === 'embed' && s.id !== id)!
		expect(duplicate.props.border).toBe('lined')
	})
})
