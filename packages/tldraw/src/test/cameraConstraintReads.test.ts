import { Box, TLCameraConstraints, TLCameraMoveOptions, VecLike } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

// Pins which overridable editor methods camera constraining calls, and in what order, per
// branch. Subclass overrides and reactive dependency capture both depend on this, so moving the
// constraint math elsewhere must keep these traces identical.

const TRACED = [
	'getCamera',
	'getCameraOptions',
	'getViewportScreenBounds',
	'getBaseZoom',
	'getInitialZoom',
] as const

const constraints: TLCameraConstraints = {
	bounds: { x: 0, y: 0, w: 1600, h: 900 },
	padding: { x: 100, y: 100 },
	origin: { x: 0.5, y: 0.5 },
	initialZoom: 'fit-max',
	baseZoom: 'fit-max',
	behavior: 'contain',
}

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	editor.updateViewportScreenBounds(new Box(0, 0, 1600, 900))
})

function traceConstrain(point: VecLike, opts?: TLCameraMoveOptions) {
	const calls: string[] = []
	for (const name of TRACED) {
		const original = editor[name].bind(editor) as (...args: any[]) => any
		vi.spyOn(editor, name).mockImplementation((...args: any[]) => {
			calls.push(name)
			return original(...args)
		})
	}
	const result = editor['getConstrainedCamera'](point, opts)
	vi.restoreAllMocks()
	return { calls, result }
}

describe('camera constraint reads', () => {
	it('reads only the current camera when forced', () => {
		editor.setCameraOptions({ constraints })
		expect(traceConstrain({ x: 10, y: 20, z: 3 }, { force: true }).calls).toEqual(['getCamera'])
	})

	it('reads options and viewport, but no fit zooms, without constraints', () => {
		expect(traceConstrain({ x: 10, y: 20, z: 3 }).calls).toEqual([
			'getCamera',
			'getCameraOptions',
			'getViewportScreenBounds',
		])
	})

	it('reads the base zoom but not the initial zoom with constraints', () => {
		editor.setCameraOptions({ constraints })
		expect(traceConstrain({ x: 10, y: 20, z: 3 }).calls).toEqual([
			'getCamera',
			'getCameraOptions',
			'getViewportScreenBounds',
			'getBaseZoom',
			'getCameraOptions',
			'getCameraOptions',
			'getViewportScreenBounds',
		])
	})

	it('reads the initial zoom last when resetting with constraints', () => {
		editor.setCameraOptions({ constraints })
		expect(traceConstrain({ x: 10, y: 20, z: 3 }, { reset: true }).calls).toEqual([
			'getCamera',
			'getCameraOptions',
			'getViewportScreenBounds',
			'getBaseZoom',
			'getCameraOptions',
			'getCameraOptions',
			'getViewportScreenBounds',
			'getInitialZoom',
			'getCameraOptions',
			'getCameraOptions',
			'getViewportScreenBounds',
		])
	})

	it('uses subclass overrides of the base and initial zoom', () => {
		class ZoomedEditor extends TestEditor {
			override getBaseZoom() {
				return 2
			}
			override getInitialZoom() {
				return 3
			}
		}
		const zoomed = new ZoomedEditor()
		zoomed.updateViewportScreenBounds(new Box(0, 0, 1600, 900))
		zoomed.setCameraOptions({ constraints, zoomSteps: [0.5, 1, 2] })

		// max zoom is zoomSteps' last step times the overridden base zoom
		expect(zoomed['getConstrainedCamera']({ x: 0, y: 0, z: 10 }).z).toBe(4)
		expect(zoomed['getConstrainedCamera']({ x: 0, y: 0, z: 10 }, { reset: true }).z).toBe(3)
	})
})
