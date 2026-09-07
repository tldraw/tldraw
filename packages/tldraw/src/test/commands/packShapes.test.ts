import { createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	boxA: createShapeId('boxA'),
	boxB: createShapeId('boxB'),
	boxC: createShapeId('boxC'),
	boxD: createShapeId('boxD'),
}

vi.useFakeTimers()

beforeEach(() => {
	editor = new TestEditor()
	editor.selectAll()
	editor.deleteShapes(editor.getSelectedShapeIds())
	editor.createShapes([
		{
			id: ids.boxA,
			type: 'geo',
			x: 0,
			y: 0,
		},
		{
			id: ids.boxB,
			type: 'geo',
			x: 100,
			y: 100,
		},
		{
			id: ids.boxC,
			type: 'geo',
			x: 400,
			y: 400,
		},
	])
})

describe('editor.packShapes', () => {
	it('packs shapes using the adjacent shape margin option', () => {
		// @ts-expect-error - testing private api
		editor.options.adjacentShapeMargin = 1
		editor.selectAll()
		const centerBefore = editor.getSelectionRotatedPageBounds()!.center.clone()
		editor.packShapes(editor.getSelectedShapeIds())
		vi.advanceTimersByTime(1000)
		expect(
			editor.getCurrentPageShapes().map((s) => ({ ...s, parentId: 'wahtever' }))
		).toMatchSnapshot('packed shapes')
		const centerAfter = editor.getSelectionRotatedPageBounds()!.center.clone()
		expect(centerBefore).toMatchObject(centerAfter)
	})

	it('packs shapes', () => {
		editor.selectAll()
		const centerBefore = editor.getSelectionRotatedPageBounds()!.center.clone()
		editor.packShapes(editor.getSelectedShapeIds(), 16)
		vi.advanceTimersByTime(1000)
		expect(
			editor.getCurrentPageShapes().map((s) => ({ ...s, parentId: 'wahtever' }))
		).toMatchSnapshot('packed shapes')
		const centerAfter = editor.getSelectionRotatedPageBounds()!.center.clone()
		expect(centerBefore).toMatchObject(centerAfter)
	})

	it('packs rotated shapes', () => {
		editor.updateShapes([{ id: ids.boxA, type: 'geo', rotation: Math.PI }])
		editor.selectAll().packShapes(editor.getSelectedShapeIds(), 16)
		vi.advanceTimersByTime(1000)
		expect(
			editor.getCurrentPageShapes().map((s) => ({ ...s, parentId: 'wahtever' }))
		).toMatchSnapshot('packed shapes')
	})

	it('packs shapes of different heights into rows, tallest first', () => {
		// With the clusters sorted ascending by height, every shape after the first was too tall
		// for the row's remaining space and fell into a single left-hand column.
		editor.selectAll()
		editor.deleteShapes(editor.getSelectedShapeIds())
		editor.createShapes([
			{ id: ids.boxA, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: ids.boxB, type: 'geo', x: 200, y: 0, props: { w: 100, h: 60 } },
			{ id: ids.boxC, type: 'geo', x: 400, y: 0, props: { w: 120, h: 80 } },
			{ id: ids.boxD, type: 'geo', x: 600, y: 0, props: { w: 100, h: 120 } },
		])
		editor.packShapes([ids.boxA, ids.boxB, ids.boxC, ids.boxD], 20)
		editor.expectShapeToMatch(
			{ id: ids.boxD, x: 110, y: 0 },
			{ id: ids.boxA, x: 230, y: 0 },
			{ id: ids.boxC, x: 350, y: 0 },
			{ id: ids.boxB, x: 490, y: 0 }
		)
	})
})
