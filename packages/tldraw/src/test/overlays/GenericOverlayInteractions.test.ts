import {
	OverlayUtil,
	Rectangle2d,
	TLOverlay,
	TLOverlayDragInfo,
	TLOverlayPointerEventInfo,
} from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

interface TLTestOverlay extends TLOverlay {
	props: {
		x: number
		y: number
		w: number
		h: number
	}
}

class TestOverlayUtil extends OverlayUtil<TLTestOverlay> {
	static override type = 'test_overlay'
	events: string[] = []

	override isActive() {
		return true
	}

	override getOverlays(): TLTestOverlay[] {
		return [
			{
				id: 'test_overlay:one',
				type: 'test_overlay',
				props: { x: 0, y: 0, w: 100, h: 100 },
			},
		]
	}

	override getGeometry(overlay: TLTestOverlay) {
		const { x, y, w, h } = overlay.props
		return new Rectangle2d({ x, y, width: w, height: h, isFilled: true })
	}

	override onPointerDown(_overlay: TLTestOverlay, _info: TLOverlayPointerEventInfo<TLTestOverlay>) {
		this.events.push('pointer_down')
	}

	override onPointerUp(_overlay: TLTestOverlay, _info: TLOverlayPointerEventInfo<TLTestOverlay>) {
		this.events.push('pointer_up')
	}

	override onClick(_overlay: TLTestOverlay, _info: TLOverlayPointerEventInfo<TLTestOverlay>) {
		this.events.push('click')
	}

	override onDragStart(_overlay: TLTestOverlay, _info: TLOverlayDragInfo<TLTestOverlay>) {
		this.events.push('drag_start')
	}

	override onDrag(_overlay: TLTestOverlay, _info: TLOverlayDragInfo<TLTestOverlay>) {
		this.events.push('drag')
	}

	override onDragEnd(_overlay: TLTestOverlay, _info: TLOverlayDragInfo<TLTestOverlay>) {
		this.events.push('drag_end')
	}
}

let editor: TestEditor
let util: TestOverlayUtil

beforeEach(() => {
	editor = new TestEditor({ overlayUtils: [TestOverlayUtil] })
	util = editor.overlays.getOverlayUtil<TestOverlayUtil>('test_overlay')
})

describe('generic overlay interactions', () => {
	it('runs the generic overlay click lifecycle', () => {
		editor.pointerMove(10, 10).pointerDown(10, 10)
		expect(editor.getPath()).toBe('select.pointing_overlay')

		editor.pointerUp(10, 10)

		expect(editor.getPath()).toBe('select.idle')
		expect(util.events).toEqual(['pointer_down', 'pointer_up', 'click'])
	})

	it('runs the generic overlay drag lifecycle', () => {
		editor.pointerMove(10, 10).pointerDown(10, 10).pointerMove(60, 60)
		expect(editor.getPath()).toBe('select.dragging_overlay')

		editor.pointerMove(80, 80).pointerUp(80, 80)

		expect(editor.getPath()).toBe('select.idle')
		expect(util.events).toEqual(['pointer_down', 'drag_start', 'drag', 'drag', 'drag', 'drag_end'])
	})
})
