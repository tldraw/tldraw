/* eslint-disable no-restricted-globals */
import { Driver } from '@tldraw/driver'
import {
	Box,
	BoxModel,
	Editor,
	HALF_PI,
	IdOf,
	RequiredKeys,
	TLContent,
	TLEditorOptions,
	TLMeasureTextOpts,
	TLShape,
	TLShapePartial,
	TLStoreOptions,
	createShapeId,
	createTLStore,
} from '@tldraw/editor'
import { vi } from 'vitest'
import { defaultBindingUtils } from '../lib/defaultBindingUtils'
import { defaultShapeTools } from '../lib/defaultShapeTools'
import { BrushOverlayUtil } from '../lib/overlays/BrushOverlayUtil'
import { SelectionForegroundOverlayUtil } from '../lib/overlays/SelectionForegroundOverlayUtil'
import { SnapIndicatorOverlayUtil } from '../lib/overlays/SnapIndicatorOverlayUtil'
import { ZoomBrushOverlayUtil } from '../lib/overlays/ZoomBrushOverlayUtil'

/**
 * Curated set of overlay utils for tests that need canvas hit-testing of
 * resize/rotate/crop handles. Excludes ArrowHint, ShapeHandle, and scribble
 * overlays which can cause circular imports or noisy reactivity in tests.
 *
 * @internal
 */
export const defaultHandleOverlays = [
	SelectionForegroundOverlayUtil,
	BrushOverlayUtil,
	ZoomBrushOverlayUtil,
	SnapIndicatorOverlayUtil,
]
import { defaultShapeUtils } from '../lib/defaultShapeUtils'
import { registerDefaultSideEffects } from '../lib/defaultSideEffects'
import { defaultTools } from '../lib/defaultTools'
import { defaultAddFontsFromNode, tipTapDefaultExtensions } from '../lib/utils/text/richText'
import { shapesFromJsx } from './test-jsx'

declare module 'vitest' {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface Matchers<T = any> {
		toCloselyMatchObject(expected: any, roundToNearest?: number): void
	}
}

vi.useFakeTimers()

Object.assign(navigator, {
	clipboard: {
		write: () => {
			//noop
		},
	},
})

// @ts-expect-error
window.ClipboardItem = class {}

/** @
 * TestEditor is a subclass of Editor that is used to test the editor.
 * @param options - The options for the editor.
 * @param storeOptions - The options for the store.
 * @returns A new TestEditor instance.
 * internal */
export class TestEditor extends Editor {
	controller: Driver

	constructor(
		options: Partial<Omit<TLEditorOptions, 'store'>> = {},
		storeOptions: Partial<TLStoreOptions> = {}
	) {
		const elm = document.createElement('div')
		const bounds = {
			x: 0,
			y: 0,
			top: 0,
			left: 0,
			width: 1080,
			height: 720,
			bottom: 720,
			right: 1080,
		}
		// make the app full screen for the sake of the insets property
		vi.spyOn(document.body, 'scrollWidth', 'get').mockImplementation(() => bounds.width)
		vi.spyOn(document.body, 'scrollHeight', 'get').mockImplementation(() => bounds.height)

		elm.tabIndex = 0
		elm.getBoundingClientRect = () => bounds as DOMRect

		const shapeUtilsWithDefaults = [
			...defaultShapeUtils.filter((s) => !options.shapeUtils?.some((su) => su.type === s.type)),
			...(options.shapeUtils ?? []),
		]
		const bindingUtilsWithDefaults = [
			...defaultBindingUtils.filter((b) => !options.bindingUtils?.some((bu) => bu.type === b.type)),
			...(options.bindingUtils ?? []),
		]

		super({
			...options,
			shapeUtils: shapeUtilsWithDefaults,
			bindingUtils: bindingUtilsWithDefaults,
			tools: [...defaultTools, ...defaultShapeTools, ...(options.tools ?? [])],
			store: createTLStore({
				shapeUtils: shapeUtilsWithDefaults,
				bindingUtils: bindingUtilsWithDefaults,
				...storeOptions,
			}),
			getContainer: () => elm,
			initialState: 'select',
			options: {
				...options.options,
				text: {
					addFontsFromNode: defaultAddFontsFromNode,
					tipTapConfig: {
						extensions: tipTapDefaultExtensions,
					},
					...options.options?.text,
				},
			},
		})
		this.elm = elm
		this.bounds = bounds
		this.controller = new Driver(this)

		// Pretty hacky way to mock the screen bounds
		document.body.appendChild(this.elm)

		this.textMeasure.measureText = (
			textToMeasure: string,
			opts: TLMeasureTextOpts
		): BoxModel & { scrollWidth: number } => {
			const breaks = textToMeasure.split('\n')
			const longest = breaks.reduce((acc, curr) => {
				return curr.length > acc.length ? curr : acc
			}, '')

			const w = longest.length * (opts.fontSize / 2)

			return {
				x: 0,
				y: 0,
				w: opts.maxWidth === null ? w : Math.max(w, opts.maxWidth),
				h:
					(opts.maxWidth === null ? breaks.length : Math.ceil(w / opts.maxWidth) + breaks.length) *
					opts.fontSize,
				scrollWidth: opts.measureScrollWidth
					? opts.maxWidth === null
						? w
						: Math.max(w, opts.maxWidth)
					: 0,
			}
		}

		this.textMeasure.measureHtml = (
			html: string,
			opts: TLMeasureTextOpts
		): BoxModel & { scrollWidth: number } => {
			const textToMeasure = html
				.split('</p><p dir="auto">')
				.join('\n')
				.replace(/<[^>]+>/g, '')
			return this.textMeasure.measureText(textToMeasure, opts)
		}

		this.textMeasure.measureTextSpans = (textToMeasure, opts) => {
			const box = this.textMeasure.measureText(textToMeasure, {
				...opts,
				maxWidth: opts.width,
				padding: `${opts.padding}px`,
			})
			return [{ box, text: textToMeasure }]
		}

		// Turn off edge scrolling for tests. Tests that require this can turn it back on.
		this.user.updateUserPreferences({ edgeScrollSpeed: 0 })

		// Wow! we'd forgotten these for a long time
		registerDefaultSideEffects(this)
	}

	getHistory() {
		return this.history
	}

	elm: HTMLElement
	readonly bounds: {
		x: number
		y: number
		top: number
		left: number
		width: number
		height: number
		bottom: number
		right: number
	}

	setScreenBounds(bounds: BoxModel, center = false) {
		this.bounds.x = bounds.x
		this.bounds.y = bounds.y
		this.bounds.top = bounds.y
		this.bounds.left = bounds.x
		this.bounds.width = bounds.w
		this.bounds.height = bounds.h
		this.bounds.right = bounds.x + bounds.w
		this.bounds.bottom = bounds.y + bounds.h

		this.updateViewportScreenBounds(Box.From(bounds), center)
		return this
	}

	/**
	 * If you need to trigger a double click, you can either mock the implementation of one of these
	 * methods, or call mockRestore() to restore the actual implementation (e.g.
	 * _transformPointerDownSpy.mockRestore())
	 */
	_transformPointerDownSpy = vi
		.spyOn(this._clickManager, 'handlePointerEvent')
		.mockImplementation((info) => {
			return info
		})
	_transformPointerUpSpy = vi
		.spyOn(this._clickManager, 'handlePointerEvent')
		.mockImplementation((info) => {
			return info
		})

	/* ---- Delegated to Driver ---- */

	getClipboard() {
		return this.controller.clipboard
	}
	setClipboard(value: TLContent | null) {
		this.controller.clipboard = value
	}
	getLastCreatedShapes(...args: Parameters<Driver['getLastCreatedShapes']>) {
		return this.controller.getLastCreatedShapes(...args)
	}
	getLastCreatedShape<T extends TLShape>() {
		return this.controller.getLastCreatedShape<T>()
	}
	testShapeID(...args: Parameters<Driver['createShapeID']>) {
		return this.controller.createShapeID(...args)
	}
	testPageID(...args: Parameters<Driver['createPageID']>) {
		return this.controller.createPageID(...args)
	}
	copy(...args: Parameters<Driver['copy']>) {
		this.controller.copy(...args)
		return this
	}
	cut(...args: Parameters<Driver['cut']>) {
		this.controller.cut(...args)
		return this
	}
	paste(...args: Parameters<Driver['paste']>) {
		this.controller.paste(...args)
		return this
	}
	getViewportPageCenter() {
		return this.controller.getViewportPageCenter()
	}
	getSelectionPageCenter() {
		return this.controller.getSelectionPageCenter()
	}
	getPageCenter(...args: Parameters<Driver['getPageCenter']>) {
		return this.controller.getPageCenter(...args)
	}
	getPageRotationById(...args: Parameters<Driver['getPageRotationById']>) {
		return this.controller.getPageRotationById(...args)
	}
	getPageRotation(...args: Parameters<Driver['getPageRotation']>) {
		return this.controller.getPageRotation(...args)
	}
	getArrowsBoundTo(...args: Parameters<Driver['getArrowsBoundTo']>) {
		return this.controller.getArrowsBoundTo(...args)
	}
	forceTick(...args: Parameters<Driver['forceTick']>) {
		this.controller.forceTick(...args)
		return this
	}
	pointerMove(...args: Parameters<Driver['pointerMove']>) {
		this.controller.pointerMove(...args)
		return this
	}
	pointerDown(...args: Parameters<Driver['pointerDown']>) {
		this.controller.pointerDown(...args)
		return this
	}
	pointerUp(...args: Parameters<Driver['pointerUp']>) {
		this.controller.pointerUp(...args)
		return this
	}
	click(...args: Parameters<Driver['click']>) {
		this.controller.click(...args)
		return this
	}
	rightClick(...args: Parameters<Driver['rightClick']>) {
		this.controller.rightClick(...args)
		return this
	}
	doubleClick(...args: Parameters<Driver['doubleClick']>) {
		this.controller.doubleClick(...args)
		return this
	}
	keyPress(...args: Parameters<Driver['keyPress']>) {
		this.controller.keyPress(...args)
		return this
	}
	keyDown(...args: Parameters<Driver['keyDown']>) {
		this.controller.keyDown(...args)
		return this
	}
	keyRepeat(...args: Parameters<Driver['keyRepeat']>) {
		this.controller.keyRepeat(...args)
		return this
	}
	keyUp(...args: Parameters<Driver['keyUp']>) {
		this.controller.keyUp(...args)
		return this
	}
	wheel(...args: Parameters<Driver['wheel']>) {
		this.controller.wheel(...args)
		return this
	}
	pan(...args: Parameters<Driver['pan']>) {
		this.controller.pan(...args)
		return this
	}
	pinchStart(...args: Parameters<Driver['pinchStart']>) {
		this.controller.pinchStart(...args)
		return this
	}
	pinchTo(...args: Parameters<Driver['pinchTo']>) {
		this.controller.pinchTo(...args)
		return this
	}
	pinchEnd(...args: Parameters<Driver['pinchEnd']>) {
		this.controller.pinchEnd(...args)
		return this
	}
	rotateSelection(...args: Parameters<Driver['rotateSelection']>) {
		this.controller.rotateSelection(...args)
		return this
	}
	translateSelection(...args: Parameters<Driver['translateSelection']>) {
		this.controller.translateSelection(...args)
		return this
	}
	resizeSelection(...args: Parameters<Driver['resizeSelection']>) {
		this.controller.resizeSelection(...args)
		return this
	}

	createShapesFromJsx(shapesJsx: React.JSX.Element | React.JSX.Element[]) {
		const { shapes, assets, ids, bindings } = shapesFromJsx(shapesJsx)
		this.createAssets(assets)
		this.createShapes(shapes)
		this.createBindings(bindings)
		return ids
	}

	/**
	 * Move to a named selection handle and pointerDown there. The chained equivalent of
	 * `pointerDown(x, y, { target: 'selection', handle })` but using a real canvas event
	 * that exercises the overlay hit-test path. Requires `defaultHandleOverlays`.
	 */
	pointerDownOnHandle(
		handle: string,
		modifiers?: Partial<{ ctrlKey: boolean; shiftKey: boolean; altKey: boolean }>
	): this {
		const p = this.getSelectionHandlePagePoint(handle)
		this.pointerMove(p.x, p.y)
		this.pointerDown(p.x, p.y, undefined, modifiers)
		return this
	}

	/**
	 * Move the pointer by the given delta from its current page position.
	 */
	pointerMoveBy(
		dx: number,
		dy: number,
		modifiers?: Partial<{ ctrlKey: boolean; shiftKey: boolean; altKey: boolean }>
	): this {
		const current = this.inputs.getCurrentPagePoint()
		this.pointerMove(current.x + dx, current.y + dy, modifiers)
		return this
	}

	/**
	 * Get the page point of a named selection handle (resize, rotate, crop, etc.)
	 * by querying the SelectionForegroundOverlayUtil. Returns a point that hit-tests
	 * to the requested overlay first (some handles overlap, e.g. rotate handles can
	 * extend into the resize square area for small selections). Requires
	 * `defaultHandleOverlays`.
	 */
	getSelectionHandlePagePoint(handle: string): { x: number; y: number } {
		const util =
			this.overlays.getOverlayUtil<SelectionForegroundOverlayUtil>('selection_foreground')
		const id = `selection_fg:${handle}`
		const overlay = util.getOverlays().find((o) => o.id === id)
		if (!overlay) {
			throw new Error(`No selection_foreground overlay found for handle "${handle}"`)
		}
		const geom = util.getGeometry(overlay)
		if (!geom) throw new Error(`Overlay "${id}" has no geometry`)

		const c = geom.center
		// First try the geometric center
		const initialHit = this.overlays.getOverlayAtPoint({ x: c.x, y: c.y })
		if (initialHit && initialHit.id === id) return { x: c.x, y: c.y }

		// Walk in a direction that escapes overlapping handles. For rotate handles,
		// walk away from the selection center (rotate is visually outside the box);
		// for resize handles, walk toward the selection center.
		const isRotate = handle.endsWith('_rotate') || handle === 'mobile_rotate'
		const selBounds = this.getSelectionPageBounds()
		if (!selBounds) return { x: c.x, y: c.y }
		const selCenter = selBounds.center
		const dx = isRotate ? c.x - selCenter.x : selCenter.x - c.x
		const dy = isRotate ? c.y - selCenter.y : selCenter.y - c.y
		const len = Math.sqrt(dx * dx + dy * dy) || 1
		const ux = dx / len
		const uy = dy / len
		for (let step = 1; step <= 20; step++) {
			const p = { x: c.x + ux * step, y: c.y + uy * step }
			const hit = this.overlays.getOverlayAtPoint(p)
			if (hit && hit.id === id) return p
		}
		return { x: c.x, y: c.y }
	}

	/* ---- Test assertions ---- */

	expectToBeIn(path: string) {
		expect(this.getPath()).toBe(path)
		return this
	}

	expectCameraToBe(x: number, y: number, z: number) {
		const camera = this.getCamera()

		expect({
			x: +camera.x.toFixed(2),
			y: +camera.y.toFixed(2),
			z: +camera.z.toFixed(2),
		}).toCloselyMatchObject({ x, y, z })

		return this
	}

	expectShapeToMatch<T extends TLShape = TLShape>(
		...model: RequiredKeys<Partial<TLShapePartial<T>>, 'id'>[]
	) {
		model.forEach((model) => {
			const shape = this.getShape(model.id!)!
			const next = { ...shape, ...model }
			expect(shape).toCloselyMatchObject(next)
		})
		return this
	}

	expectPageBoundsToBe<T extends TLShape = TLShape>(id: IdOf<T>, bounds: Partial<BoxModel>) {
		const observedBounds = this.getShapePageBounds(id)!
		expect(observedBounds).toCloselyMatchObject(bounds)
		return this
	}

	expectScreenBoundsToBe<T extends TLShape = TLShape>(id: IdOf<T>, bounds: Partial<BoxModel>) {
		const pageBounds = this.getShapePageBounds(id)!
		const screenPoint = this.pageToScreen(pageBounds.point)
		const observedBounds = pageBounds.clone()
		observedBounds.x = screenPoint.x
		observedBounds.y = screenPoint.y
		expect(observedBounds).toCloselyMatchObject(bounds)
		return this
	}
}

export const defaultShapesIds = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	ellipse1: createShapeId('ellipse1'),
}

export const createDefaultShapes = (): TLShapePartial[] => [
	{
		id: defaultShapesIds.box1,
		type: 'geo',
		x: 100,
		y: 100,
		props: {
			w: 100,
			h: 100,
			geo: 'rectangle',
		},
	},
	{
		id: defaultShapesIds.box2,
		type: 'geo',
		x: 200,
		y: 200,
		rotation: HALF_PI / 2,
		props: {
			w: 100,
			h: 100,
			color: 'black',
			fill: 'none',
			dash: 'draw',
			size: 'm',
			geo: 'rectangle',
		},
	},
	{
		id: defaultShapesIds.ellipse1,
		type: 'geo',
		parentId: defaultShapesIds.box2,
		x: 200,
		y: 200,
		props: {
			w: 50,
			h: 50,
			color: 'black',
			fill: 'none',
			dash: 'draw',
			size: 'm',
			geo: 'ellipse',
		},
	},
]
