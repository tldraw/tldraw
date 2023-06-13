import { ReadonlySharedStyleMap, SharedStyle } from '../utils/SharedStylesMap'
import { TestEditor, createDefaultShapes, defaultShapesIds } from './TestEditor'

let editor: TestEditor

function asPlainObject(styles: ReadonlySharedStyleMap | null) {
	if (!styles) return null
	const object: Record<string, SharedStyle<unknown>> = {}
	for (const [key, value] of styles) {
		object[key.id] = value
	}
	return object
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes(createDefaultShapes())
	editor.reparentShapesById([defaultShapesIds.ellipse1], editor.currentPageId)
})

describe('Editor.props', () => {
	it('should an empty map if nothing is selected', () => {
		editor.selectNone()
		expect(asPlainObject(editor.styles)).toStrictEqual({})
	})

	it('should return props for a single shape', () => {
		editor.select(defaultShapesIds.box1)
		expect(asPlainObject(editor.styles)).toStrictEqual({
			'tldraw:horizontalAlign': { type: 'shared', value: 'middle' },
			'tldraw:labelColor': { type: 'shared', value: 'black' },
			'tldraw:color': { type: 'shared', value: 'black' },
			'tldraw:dash': { type: 'shared', value: 'draw' },
			'tldraw:fill': { type: 'shared', value: 'none' },
			'tldraw:size': { type: 'shared', value: 'm' },
			'tldraw:font': { type: 'shared', value: 'draw' },
			'tldraw:geo': { type: 'shared', value: 'rectangle' },
			'tldraw:verticalAlign': { type: 'shared', value: 'middle' },
		})
	})

	it('should return props for two matching shapes', () => {
		editor.select(defaultShapesIds.box1, defaultShapesIds.box2)
		expect(asPlainObject(editor.styles)).toStrictEqual({
			'tldraw:horizontalAlign': { type: 'shared', value: 'middle' },
			'tldraw:labelColor': { type: 'shared', value: 'black' },
			'tldraw:color': { type: 'shared', value: 'black' },
			'tldraw:dash': { type: 'shared', value: 'draw' },
			'tldraw:fill': { type: 'shared', value: 'none' },
			'tldraw:size': { type: 'shared', value: 'm' },
			'tldraw:font': { type: 'shared', value: 'draw' },
			'tldraw:geo': { type: 'shared', value: 'rectangle' },
			'tldraw:verticalAlign': { type: 'shared', value: 'middle' },
		})
	})

	it('should return mixed props for shapes that have mixed values', () => {
		editor.updateShapes([
			{
				id: defaultShapesIds.box1,
				type: 'geo',
				props: { h: 200, w: 200, color: 'red', dash: 'solid' },
			},
		])

		editor.select(defaultShapesIds.box1, defaultShapesIds.box2)

		expect(asPlainObject(editor.styles)).toStrictEqual({
			'tldraw:horizontalAlign': { type: 'shared', value: 'middle' },
			'tldraw:labelColor': { type: 'shared', value: 'black' },
			'tldraw:color': { type: 'mixed' },
			'tldraw:dash': { type: 'mixed' },
			'tldraw:fill': { type: 'shared', value: 'none' },
			'tldraw:size': { type: 'shared', value: 'm' },
			'tldraw:font': { type: 'shared', value: 'draw' },
			'tldraw:geo': { type: 'shared', value: 'rectangle' },
			'tldraw:verticalAlign': { type: 'shared', value: 'middle' },
		})
	})

	it('should return mixed for all mixed props', () => {
		editor.updateShapes([
			{
				id: defaultShapesIds.box1,
				type: 'geo',
				props: { h: 200, w: 200, color: 'red', dash: 'solid' },
			},
			{
				id: defaultShapesIds.box2,
				type: 'geo',
				props: { size: 'l', fill: 'pattern', font: 'mono' },
			},
			{
				id: defaultShapesIds.ellipse1,
				type: 'geo',
				props: {
					align: 'start',
					text: 'hello world this is a long sentence that should wrap',
					w: 100,
					url: 'https://aol.com',
					verticalAlign: 'start',
				},
			},
		])

		editor.selectAll()

		expect(asPlainObject(editor.styles)).toStrictEqual({
			'tldraw:color': { type: 'mixed' },
			'tldraw:dash': { type: 'mixed' },
			'tldraw:fill': { type: 'mixed' },
			'tldraw:font': { type: 'mixed' },
			'tldraw:geo': { type: 'mixed' },
			'tldraw:horizontalAlign': { type: 'mixed' },
			'tldraw:labelColor': { type: 'shared', value: 'black' },
			'tldraw:size': { type: 'mixed' },
			'tldraw:verticalAlign': { type: 'mixed' },
		})
	})
})
