import {
	createShapeId,
	DefaultColorStyle,
	GeoShapeGeoStyle,
	StyleProp,
	TLGeoShape,
} from '@tldraw/editor'
import { vi } from 'vitest'
import { SelectTool } from '../lib/tools/SelectTool/SelectTool'
import { TestEditor } from './TestEditor'

let editor: TestEditor

const ids = {
	red: createShapeId('red'),
	blue: createShapeId('blue'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes([
		{ id: ids.red, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100, color: 'red' } },
		{ id: ids.blue, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100, color: 'blue' } },
	])
})

function getSelectTool() {
	return editor.getStateDescendant<SelectTool>('select')!
}

// Mirrors the `copy-styles` action: capture the selection's shared styles and arm the select tool.
function copyStylesFromSelection() {
	const styles: Array<[StyleProp<unknown>, unknown]> = []
	for (const [style, value] of editor.getSharedStyles()) {
		if (value.type !== 'shared' || style === GeoShapeGeoStyle) continue
		styles.push([style, value.value])
	}
	getSelectTool().stylesToPaste = styles
}

function color(id: typeof ids.red) {
	return editor.getShape<TLGeoShape>(id)!.props.color
}

describe('copy styles between shapes', () => {
	it('applies the copied styles to the next clicked shape', () => {
		editor.select(ids.red)
		copyStylesFromSelection()

		const blue = editor.getShape(ids.blue)!
		editor.pointerDown(250, 50, { target: 'shape', shape: blue }).pointerUp()

		expect(color(ids.blue)).toBe('red')
		// the source shape is untouched
		expect(color(ids.red)).toBe('red')
		// the buffer is cleared after a single apply
		expect(getSelectTool().stylesToPaste).toBe(null)
	})

	it('does not change the geo type when copying styles', () => {
		editor.updateShape({ id: ids.red, type: 'geo', props: { geo: 'ellipse' } })
		editor.select(ids.red)
		copyStylesFromSelection()

		const blue = editor.getShape(ids.blue)!
		editor.pointerDown(250, 50, { target: 'shape', shape: blue }).pointerUp()

		expect(color(ids.blue)).toBe('red')
		// geo style is excluded, so the target keeps its own shape type
		expect(editor.getShape<TLGeoShape>(ids.blue)!.props.geo).toBe('rectangle')
	})

	it('clears the buffer without applying when clicking empty canvas', () => {
		editor.select(ids.red)
		copyStylesFromSelection()

		editor.pointerDown(500, 500, { target: 'canvas' }).pointerUp()

		expect(color(ids.blue)).toBe('blue')
		expect(getSelectTool().stylesToPaste).toBe(null)
	})

	it('clears the buffer on escape', () => {
		editor.select(ids.red)
		copyStylesFromSelection()

		editor.cancel()

		expect(getSelectTool().stylesToPaste).toBe(null)
	})

	it('does not apply styles to a locked shape and follows the normal flow', () => {
		editor.updateShape({ id: ids.blue, type: 'geo', isLocked: true })
		editor.select(ids.red)
		copyStylesFromSelection()

		const blue = editor.getShape(ids.blue)!
		editor.pointerDown(250, 50, { target: 'shape', shape: blue }).pointerUp()

		// the locked shape keeps its own color
		expect(color(ids.blue)).toBe('blue')
		// the click was not intercepted: it followed the normal pointing_canvas flow,
		// which clears the selection rather than selecting the locked shape
		expect(editor.getSelectedShapeIds()).toEqual([])
		// and the buffer is cleared
		expect(getSelectTool().stylesToPaste).toBe(null)
	})

	it('clears the buffer on right click without applying', () => {
		editor.select(ids.red)
		copyStylesFromSelection()

		const blue = editor.getShape(ids.blue)!
		editor.rightClick(250, 50, { target: 'shape', shape: blue })

		expect(color(ids.blue)).toBe('blue')
		expect(getSelectTool().stylesToPaste).toBe(null)
	})

	it('clears the buffer when leaving the select tool', () => {
		editor.select(ids.red)
		copyStylesFromSelection()

		editor.setCurrentTool('draw')

		expect(getSelectTool().stylesToPaste).toBe(null)
	})

	it('does not paste styles onto a child of a locked group via canvas hit testing', () => {
		// Fill the child so canvas hit testing finds it at an interior point. Group the two shapes
		// and lock the group: the children aren't locked themselves, only their ancestor is.
		editor.updateShape({ id: ids.red, type: 'geo', props: { fill: 'solid' } })
		const groupId = createShapeId('group')
		editor.groupShapes([ids.red, ids.blue], { groupId })
		editor.updateShape({ id: groupId, type: 'group', isLocked: true })
		editor.selectNone()

		getSelectTool().stylesToPaste = [[DefaultColorStyle, 'green']]

		// A canvas pointer down over the red child must not be treated as a paste target, matching
		// the direct shape branch (which uses isShapeOrAncestorLocked).
		const applySpy = vi.spyOn(editor, 'setStyleForSelectedShapes')
		editor.pointerDown(50, 50, { target: 'canvas' }).pointerUp()

		expect(applySpy).not.toHaveBeenCalled()
		expect(color(ids.red)).toBe('red')
		expect(getSelectTool().stylesToPaste).toBe(null)
	})
})
