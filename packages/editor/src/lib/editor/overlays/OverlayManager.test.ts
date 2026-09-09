import { atom, react } from '@tldraw/state'
import { vi } from 'vitest'
import { Geometry2d } from '../../primitives/geometry/Geometry2d'
import { Rectangle2d } from '../../primitives/geometry/Rectangle2d'
import { TestEditor } from '../../test/TestEditor'
import { Editor } from '../Editor'
import { OverlayManager } from './OverlayManager'
import { OverlayUtil, TLOverlay } from './OverlayUtil'

type BoxOverlay = TLOverlay<{ x: number; y: number; w: number; h: number }>

// Each util exposes atoms so tests can drive activity and overlay output
// without going through real editor state.
abstract class StubOverlayUtil<T extends TLOverlay = TLOverlay> extends OverlayUtil<T> {
	readonly active = atom('active', true)
	readonly items = atom<T[]>('items', [])
	dispose = vi.fn()

	isActive() {
		return this.active.get()
	}
	getOverlays() {
		return this.items.get()
	}
}

class BoxOverlayUtil extends StubOverlayUtil<BoxOverlay> {
	static override type = 'box'
	override options = { zIndex: 10, isFilled: false }

	getGeometry = vi.fn((overlay: BoxOverlay): Geometry2d | null => {
		const { x, y, w, h } = overlay.props
		return new Rectangle2d({ x, y, width: w, height: h, isFilled: this.options.isFilled })
	})
}

class DotOverlayUtil extends StubOverlayUtil {
	static override type = 'dot'
	override options = { zIndex: 10 }
}

class LabelOverlayUtil extends StubOverlayUtil {
	static override type = 'label'
	override options = { zIndex: 5 }
}

class UntypedOverlayUtil extends StubOverlayUtil {}

function box(id: string, x: number, y: number, w = 10, h = 10): BoxOverlay {
	return { id, type: 'box', props: { x, y, w, h } }
}

let editor: Editor
let overlays: OverlayManager

beforeEach(() => {
	editor = new TestEditor({ overlayUtils: [BoxOverlayUtil, DotOverlayUtil, LabelOverlayUtil] })
	overlays = editor.overlays
})

afterEach(() => {
	editor.dispose()
})

describe('registerUtil', () => {
	it('registers the utils passed to the editor', () => {
		expect(overlays.getOverlayUtil('box')).toBeInstanceOf(BoxOverlayUtil)
		expect(overlays.getOverlayUtil('dot')).toBeInstanceOf(DotOverlayUtil)
		expect(overlays.getOverlayUtil('label')).toBeInstanceOf(LabelOverlayUtil)
	})

	it('rejects utils without a static type', () => {
		expect(() => overlays.registerUtil(new UntypedOverlayUtil(editor))).toThrow(
			"Overlay util UntypedOverlayUtil is missing a static 'type' property."
		)
	})

	it('rejects duplicate types', () => {
		expect(() => overlays.registerUtil(new BoxOverlayUtil(editor))).toThrow(
			'Duplicate overlay util type: "box"'
		)
	})

	it('rejects duplicate types at editor construction', () => {
		expect(() => new TestEditor({ overlayUtils: [BoxOverlayUtil, BoxOverlayUtil] })).toThrow(
			'Duplicate overlay util type: "box"'
		)
	})
})

describe('getOverlayUtil', () => {
	it('looks up by type string or by overlay instance', () => {
		const util = overlays.getOverlayUtil('box')
		expect(overlays.getOverlayUtil(box('a', 0, 0))).toBe(util)
	})

	it('throws for an unknown type', () => {
		expect(() => overlays.getOverlayUtil('nope')).toThrow('No overlay util found for type: "nope"')
	})
})

describe('getOverlayUtilsInZOrder', () => {
	it('sorts by zIndex ascending, breaking ties by registration order', () => {
		expect(overlays.getOverlayUtilsInZOrder().map((u) => (u.constructor as any).type)).toEqual([
			'label',
			'box',
			'dot',
		])
	})

	it('treats a missing zIndex as zero', () => {
		class ZeroUtil extends StubOverlayUtil {
			static override type = 'zero'
		}
		overlays.registerUtil(new ZeroUtil(editor))

		expect(overlays.getOverlayUtilsInZOrder().map((u) => (u.constructor as any).type)).toEqual([
			'zero',
			'label',
			'box',
			'dot',
		])
	})

	it('applies zIndex overrides from configure', () => {
		const HighLabel = LabelOverlayUtil.configure({ zIndex: 100 })
		const custom = new TestEditor({ overlayUtils: [BoxOverlayUtil, HighLabel] })
		try {
			expect(custom.overlays.getOverlayUtil('label').options).toEqual({ zIndex: 100 })
			expect(
				custom.overlays.getOverlayUtilsInZOrder().map((u) => (u.constructor as any).type)
			).toEqual(['box', 'label'])
		} finally {
			custom.dispose()
		}
	})
})

describe('active overlays', () => {
	it('lists active utils with their overlays in paint order', () => {
		const boxUtil = overlays.getOverlayUtil<BoxOverlayUtil>('box')
		const labelUtil = overlays.getOverlayUtil<LabelOverlayUtil>('label')
		const dotUtil = overlays.getOverlayUtil<DotOverlayUtil>('dot')

		const a = box('a', 0, 0)
		const label = { id: 'l', type: 'label', props: {} }
		boxUtil.items.set([a])
		labelUtil.items.set([label])
		dotUtil.active.set(false)
		dotUtil.items.set([{ id: 'd', type: 'dot', props: {} }])

		expect(overlays.getActiveOverlayEntries()).toEqual([
			{ util: labelUtil, overlays: [label] },
			{ util: boxUtil, overlays: [a] },
		])
		expect(overlays.getCurrentOverlays()).toEqual([label, a])
	})

	it('includes active utils that produce no overlays', () => {
		const boxUtil = overlays.getOverlayUtil<BoxOverlayUtil>('box')
		overlays.getOverlayUtil<LabelOverlayUtil>('label').active.set(false)
		overlays.getOverlayUtil<DotOverlayUtil>('dot').active.set(false)

		expect(overlays.getActiveOverlayEntries()).toEqual([{ util: boxUtil, overlays: [] }])
		expect(overlays.getCurrentOverlays()).toEqual([])
	})

	it('is reactive to activity and overlay changes', () => {
		const boxUtil = overlays.getOverlayUtil<BoxOverlayUtil>('box')
		const seen: string[][] = []
		const stop = react('overlays', () => {
			seen.push(overlays.getCurrentOverlays().map((o) => o.id))
		})

		boxUtil.items.set([box('a', 0, 0)])
		boxUtil.active.set(false)
		boxUtil.active.set(true)

		expect(seen).toEqual([[], ['a'], [], ['a']])
		stop()
	})

	it('does not call getOverlays for inactive utils', () => {
		const boxUtil = overlays.getOverlayUtil<BoxOverlayUtil>('box')
		const spy = vi.spyOn(boxUtil, 'getOverlays')
		boxUtil.active.set(false)

		overlays.getCurrentOverlays()
		expect(spy).not.toHaveBeenCalled()
		spy.mockRestore()
	})
})

describe('getOverlayGeometry', () => {
	it('caches geometry by overlay identity', () => {
		const boxUtil = overlays.getOverlayUtil<BoxOverlayUtil>('box')
		const a = box('a', 5, 5, 20, 30)

		const first = overlays.getOverlayGeometry(a)
		const second = overlays.getOverlayGeometry(a)

		expect(first).toBe(second)
		expect(first!.bounds).toMatchObject({ x: 5, y: 5, w: 20, h: 30 })
		expect(boxUtil.getGeometry).toHaveBeenCalledTimes(1)

		overlays.getOverlayGeometry(box('a', 5, 5, 20, 30))
		expect(boxUtil.getGeometry).toHaveBeenCalledTimes(2)
	})

	it('returns null for non-interactive overlays', () => {
		expect(overlays.getOverlayGeometry({ id: 'd', type: 'dot', props: {} })).toBeNull()
	})
})

describe('hovered overlay', () => {
	it('starts with nothing hovered', () => {
		expect(overlays.getHoveredOverlayId()).toBeNull()
		expect(overlays.getHoveredOverlay()).toBeNull()
	})

	it('resolves the hovered overlay from the current overlays', () => {
		const boxUtil = overlays.getOverlayUtil<BoxOverlayUtil>('box')
		const a = box('a', 0, 0)
		boxUtil.items.set([a])

		overlays.setHoveredOverlay('a')
		expect(overlays.getHoveredOverlayId()).toBe('a')
		expect(overlays.getHoveredOverlay()).toBe(a)

		boxUtil.items.set([])
		expect(overlays.getHoveredOverlayId()).toBe('a')
		expect(overlays.getHoveredOverlay()).toBeNull()

		overlays.setHoveredOverlay(null)
		expect(overlays.getHoveredOverlay()).toBeNull()
	})

	it('does not notify reactors when the id is unchanged', () => {
		let runs = 0
		const stop = react('hover', () => {
			overlays.getHoveredOverlayId()
			runs++
		})

		overlays.setHoveredOverlay('a')
		overlays.setHoveredOverlay('a')
		expect(runs).toBe(2)
		stop()
	})
})

describe('getOverlayAtPoint', () => {
	let boxUtil: BoxOverlayUtil

	beforeEach(() => {
		boxUtil = overlays.getOverlayUtil<BoxOverlayUtil>('box')
		overlays.getOverlayUtil<DotOverlayUtil>('dot').active.set(false)
		overlays.getOverlayUtil<LabelOverlayUtil>('label').active.set(false)
	})

	it('returns null when nothing is hit', () => {
		boxUtil.items.set([box('a', 0, 0)])
		expect(overlays.getOverlayAtPoint({ x: 50, y: 50 })).toBeNull()
	})

	it('returns null when there are no overlays', () => {
		expect(overlays.getOverlayAtPoint({ x: 0, y: 0 })).toBeNull()
	})

	it('hits inside an unfilled overlay, and outside it only within the margin', () => {
		const a = box('a', 0, 0, 100, 100)
		boxUtil.items.set([a])

		expect(overlays.getOverlayAtPoint({ x: 50, y: 50 })).toBe(a)
		expect(overlays.getOverlayAtPoint({ x: 50, y: -3 })).toBeNull()
		expect(overlays.getOverlayAtPoint({ x: 50, y: -3 }, 4)).toBe(a)
		expect(overlays.getOverlayAtPoint({ x: 50, y: -5 }, 4)).toBeNull()
	})

	it('hits anywhere inside a filled overlay and ignores the margin', () => {
		boxUtil.options.isFilled = true
		const a = box('a', 0, 0, 100, 100)
		boxUtil.items.set([a])

		expect(overlays.getOverlayAtPoint({ x: 50, y: 50 })).toBe(a)
		expect(overlays.getOverlayAtPoint({ x: 103, y: 50 }, 10)).toBeNull()
	})

	it('prefers the first overlay within a util', () => {
		const a = box('a', 0, 0)
		const b = box('b', 0, 0)
		boxUtil.items.set([a, b])

		expect(overlays.getOverlayAtPoint({ x: 0, y: 5 })).toBe(a)
	})

	it('prefers the util with the highest zIndex', () => {
		class TopUtil extends BoxOverlayUtil {
			static override type = 'top'
			override options = { zIndex: 50, isFilled: false }
		}
		class BottomUtil extends BoxOverlayUtil {
			static override type = 'bottom'
			override options = { zIndex: 1, isFilled: false }
		}
		const custom = new TestEditor({ overlayUtils: [TopUtil, BoxOverlayUtil, BottomUtil] })
		try {
			const top = custom.overlays.getOverlayUtil<TopUtil>('top')
			const middle = custom.overlays.getOverlayUtil<BoxOverlayUtil>('box')
			const bottom = custom.overlays.getOverlayUtil<BottomUtil>('bottom')
			const t = { ...box('t', 0, 0), type: 'top' }
			const m = box('m', 0, 0)
			const b = { ...box('b', 0, 0), type: 'bottom' }
			top.items.set([t])
			middle.items.set([m])
			bottom.items.set([b])

			expect(custom.overlays.getOverlayAtPoint({ x: 0, y: 5 })).toBe(t)

			top.active.set(false)
			expect(custom.overlays.getOverlayAtPoint({ x: 0, y: 5 })).toBe(m)

			middle.items.set([])
			expect(custom.overlays.getOverlayAtPoint({ x: 0, y: 5 })).toBe(b)
		} finally {
			custom.dispose()
		}
	})

	it('skips overlays without geometry', () => {
		const dotUtil = overlays.getOverlayUtil<DotOverlayUtil>('dot')
		dotUtil.active.set(true)
		dotUtil.items.set([{ id: 'd', type: 'dot', props: {} }])
		const a = box('a', 0, 0)
		boxUtil.items.set([a])

		expect(overlays.getOverlayAtPoint({ x: 0, y: 5 })).toBe(a)
	})
})

describe('dispose', () => {
	it('disposes every registered util when the editor is disposed', () => {
		const utils = ['box', 'dot', 'label'].map((type) =>
			overlays.getOverlayUtil<StubOverlayUtil>(type)
		)
		editor.dispose()
		for (const util of utils) {
			expect(util.dispose).toHaveBeenCalledTimes(1)
		}
	})
})
