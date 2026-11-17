import { act } from '@testing-library/react'
import { TLNoteShape, TLShapeId, TLTextShape, createShapeId, toRichText } from '@tldraw/editor'
import { NoteShapeUtil } from '../lib/shapes/note/NoteShapeUtil'
import { TextShapeUtil } from '../lib/shapes/text/TextShapeUtil'
import { Tldraw } from '../lib/Tldraw'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

// #11315: reading the selected shape id directly in component() made every text and note shape
// re-render on any selection change, not just the shapes whose selected state flipped.

const renders = new Map<TLShapeId, number>()
function countRender(id: TLShapeId) {
	renders.set(id, (renders.get(id) ?? 0) + 1)
}

class CountingTextShapeUtil extends TextShapeUtil {
	override component(shape: TLTextShape) {
		countRender(shape.id)
		return super.component(shape)
	}
}

class CountingNoteShapeUtil extends NoteShapeUtil {
	override component(shape: TLNoteShape) {
		countRender(shape.id)
		return super.component(shape)
	}
}

const ids = Array.from({ length: 6 }, (_, i) => createShapeId(`shape${i}`))
const [a, b] = ids
const geoA = createShapeId('geoA')
const geoB = createShapeId('geoB')

async function setup(type: 'text' | 'note') {
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw onMount={onMount} shapeUtils={[CountingTextShapeUtil, CountingNoteShapeUtil]} />
		),
		{ waitForPatterns: false }
	)
	act(() => {
		editor.createShapes(
			ids.map((id, i) => ({ id, type, x: i * 250, y: 0, props: { richText: toRichText('hi') } }))
		)
		editor.createShapes([
			{ id: geoA, type: 'geo', x: 0, y: 400 },
			{ id: geoB, type: 'geo', x: 250, y: 400 },
		])
	})
	return editor
}

function rendersDuring(fn: () => void) {
	renders.clear()
	act(fn)
	return Object.fromEntries(renders)
}

describe.each(['text', 'note'] as const)('%s shapes on selection change', (type) => {
	it('re-renders only the shapes whose selected state changes', async () => {
		const editor = await setup(type)
		act(() => editor.select(a))

		expect(rendersDuring(() => editor.select(b))).toEqual({ [a]: 1, [b]: 1 })
	})

	it('does not re-render when the selection moves between other shapes', async () => {
		const editor = await setup(type)
		act(() => editor.select(geoA))

		expect(rendersDuring(() => editor.select(geoB))).toEqual({})
	})
})
