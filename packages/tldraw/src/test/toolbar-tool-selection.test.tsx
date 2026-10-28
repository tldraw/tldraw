import { act } from '@testing-library/react'
import { Editor, GeoShapeGeoStyle } from '@tldraw/editor'
import { GeoShapeUtil } from '../lib/shapes/geo/GeoShapeUtil'
import { PathBuilder } from '../lib/shapes/shared/PathBuilder'
import { Tldraw } from '../lib/Tldraw'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

let editor: Editor

function pressedToolValues() {
	const els = document.querySelectorAll(
		'.tlui-main-toolbar__tools [data-value][aria-pressed="true"]'
	)
	return [...els].map((el) => el.getAttribute('data-value')!)
}

beforeEach(async () => {
	;({ editor } = await renderTldrawComponentWithEditor((onMount) => <Tldraw onMount={onMount} />, {
		waitForPatterns: false,
	}))
})

it('keeps only the originating tool highlighted while the zoom tool masks itself', async () => {
	await act(async () => {
		editor.setCurrentTool('draw')
	})
	expect(pressedToolValues()).toEqual(['draw'])

	await act(async () => {
		editor.setCurrentTool('zoom', { onInteractionEnd: 'draw.idle' })
	})
	expect(pressedToolValues()).toEqual(['draw'])
})

it('keeps only the originating geo variant highlighted while the zoom tool masks itself', async () => {
	await act(async () => {
		editor.setStyleForNextShapes(GeoShapeGeoStyle, 'ellipse')
		editor.setCurrentTool('geo')
	})
	expect(pressedToolValues()).toEqual(['ellipse'])

	// Tools with no geo variant used to match the zoom tool's empty shared styles and all light up
	await act(async () => {
		editor.setCurrentTool('zoom', { onInteractionEnd: 'geo.idle' })
	})
	expect(pressedToolValues()).toEqual(['ellipse'])
})

// The toolbar builds a button per GeoShapeGeoStyle value, and GeoShapeUtil.configure() adds the
// custom types to that style. Reading their label used to dereference a message declared only for
// the built-ins, so a single custom type threw while the toolbar built and took the editor down
// with it — the canvas never mounted. The examples e2e caught it; nothing here did.
it('still mounts with a geo type added through configure()', async () => {
	const builtins = [...GeoShapeGeoStyle.values]
	const Configured = GeoShapeUtil.configure({
		customGeoTypes: {
			'rounded-rect': {
				getPath: (w: number, h: number) =>
					new PathBuilder()
						.moveTo(0, 0, { geometry: { isFilled: true } })
						.lineTo(w, 0)
						.lineTo(w, h)
						.lineTo(0, h)
						.close(),
				snapType: 'polygon' as const,
				icon: 'geo-rectangle' as const,
			},
		},
	})
	try {
		const { editor: configured } = await renderTldrawComponentWithEditor(
			(onMount) => <Tldraw shapeUtils={[Configured]} onMount={onMount} />,
			{ waitForPatterns: false }
		)
		try {
			expect(configured.getShapeUtil('geo')).toBeTruthy()
			expect(document.querySelectorAll('.tl-canvas').length).toBeGreaterThan(0)
		} finally {
			configured.dispose()
		}
	} finally {
		// configure() mutates GeoShapeGeoStyle.values globally, so clean up or it leaks to other files.
		const added = GeoShapeGeoStyle.values.filter((v) => !builtins.includes(v))
		if (added.length) GeoShapeGeoStyle.removeValues(...added)
	}
})
