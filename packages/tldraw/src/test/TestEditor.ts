import {
	Box,
	BoxModel,
	Editor,
	HALF_PI,
	IdOf,
	RequiredKeys,
	RotateCorner,
	SelectionHandle,
	TLContent,
	TLEditorOptions,
	TLKeyboardEventInfo,
	TLMeasureTextOpts,
	TLPinchEventInfo,
	TLPointerEventInfo,
	TLShape,
	TLShapeId,
	TLShapePartial,
	TLStoreOptions,
	TLWheelEventInfo,
	VecLike,
	createShapeId,
	createTLStore,
} from '@tldraw/editor'
import type { EventModifiers, PointerEventInit } from '@tldraw/macropad'
import { Macropad } from '@tldraw/macropad'
import { vi } from 'vitest'
import { defaultBindingUtils } from '../lib/defaultBindingUtils'
import { defaultShapeTools } from '../lib/defaultShapeTools'
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

export class TestEditor extends Editor {
	controller: Macropad

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
		this.controller = new Macropad(this)

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

		this.sideEffects.registerAfterCreateHandler('shape', (record) => {
			this._lastCreatedShapes.push(record)
		})

		// Wow! we'd forgotten these for a long time
		registerDefaultSideEffects(this)
	}

	getHistory() {
		return this.history
	}

	private _lastCreatedShapes: TLShape[] = []

	/**
	 * Get the last created shapes.
	 *
	 * @param count - The number of shapes to get.
	 */
	getLastCreatedShapes(count = 1) {
		return this._lastCreatedShapes.slice(-count).map((s) => this.getShape(s)!)
	}

	/**
	 * Get the last created shape.
	 */
	getLastCreatedShape<T extends TLShape>() {
		const lastShape = this._lastCreatedShapes[this._lastCreatedShapes.length - 1] as T
		return this.getShape<T>(lastShape)!
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

	/* ---- Delegated to Macropad: clipboard ---- */

	clipboard = null as TLContent | null

	copy(ids = this.getSelectedShapeIds()) {
		this.controller.copy(ids)
		this.clipboard = this.controller.clipboard
		return this
	}

	cut(ids = this.getSelectedShapeIds()) {
		this.controller.cut(ids)
		this.clipboard = this.controller.clipboard
		return this
	}

	paste(point?: VecLike) {
		this.controller.clipboard = this.clipboard
		this.controller.paste(point)
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

	/* ---- Delegated to Macropad: IDs ---- */

	testShapeID(id: string) {
		return this.controller.testShapeID(id)
	}
	testPageID(id: string) {
		return this.controller.testPageID(id)
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

	/* ---- Delegated to Macropad: queries ---- */

	getViewportPageCenter() {
		return this.controller.getViewportPageCenter()
	}

	getSelectionPageCenter() {
		return this.controller.getSelectionPageCenter()
	}

	getPageCenter(shape: TLShape) {
		return this.controller.getPageCenter(shape)
	}

	getPageRotationById(id: TLShapeId): number {
		return this.controller.getPageRotationById(id)
	}

	getPageRotation(shape: TLShape) {
		return this.controller.getPageRotation(shape)
	}

	getArrowsBoundTo(shapeId: TLShapeId) {
		return this.controller.getArrowsBoundTo(shapeId)
	}

	/* ---- Delegated to Macropad: input events ---- */

	forceTick(count = 1) {
		this.controller.forceTick(count)
		return this
	}

	pointerMove(
		x = this.inputs.getCurrentScreenPoint().x,
		y = this.inputs.getCurrentScreenPoint().y,
		options?: PointerEventInit,
		modifiers?: EventModifiers
	) {
		this.controller.pointerMove(x, y, options, modifiers)
		return this
	}

	pointerDown(
		x = this.inputs.getCurrentScreenPoint().x,
		y = this.inputs.getCurrentScreenPoint().y,
		options?: PointerEventInit,
		modifiers?: EventModifiers
	) {
		this.controller.pointerDown(x, y, options, modifiers)
		return this
	}

	pointerUp(
		x = this.inputs.getCurrentScreenPoint().x,
		y = this.inputs.getCurrentScreenPoint().y,
		options?: PointerEventInit,
		modifiers?: EventModifiers
	) {
		this.controller.pointerUp(x, y, options, modifiers)
		return this
	}

	click(
		x = this.inputs.getCurrentScreenPoint().x,
		y = this.inputs.getCurrentScreenPoint().y,
		options?: PointerEventInit,
		modifiers?: EventModifiers
	) {
		this.controller.click(x, y, options, modifiers)
		return this
	}

	rightClick(
		x = this.inputs.getCurrentScreenPoint().x,
		y = this.inputs.getCurrentScreenPoint().y,
		options?: PointerEventInit,
		modifiers?: EventModifiers
	) {
		this.controller.rightClick(x, y, options, modifiers)
		return this
	}

	doubleClick(
		x = this.inputs.getCurrentScreenPoint().x,
		y = this.inputs.getCurrentScreenPoint().y,
		options?: PointerEventInit,
		modifiers?: EventModifiers
	) {
		this.controller.doubleClick(x, y, options, modifiers)
		return this
	}

	keyPress(key: string, options = {} as Partial<Exclude<TLKeyboardEventInfo, 'key'>>) {
		this.controller.keyPress(key, options)
		return this
	}

	keyDown(key: string, options = {} as Partial<Exclude<TLKeyboardEventInfo, 'key'>>) {
		this.controller.keyDown(key, options)
		return this
	}

	keyRepeat(key: string, options = {} as Partial<Exclude<TLKeyboardEventInfo, 'key'>>) {
		this.controller.keyRepeat(key, options)
		return this
	}

	keyUp(key: string, options = {} as Partial<Omit<TLKeyboardEventInfo, 'key'>>) {
		this.controller.keyUp(key, options)
		return this
	}

	wheel(dx: number, dy: number, options = {} as Partial<Omit<TLWheelEventInfo, 'delta'>>) {
		this.controller.wheel(dx, dy, options)
		return this
	}

	pan(offset: VecLike): this {
		this.controller.pan(offset)
		return this
	}

	pinchStart(
		x = this.inputs.getCurrentScreenPoint().x,
		y = this.inputs.getCurrentScreenPoint().y,
		z: number,
		dx: number,
		dy: number,
		dz: number,
		options = {} as Partial<Omit<TLPinchEventInfo, 'point' | 'delta' | 'offset'>>
	) {
		this.controller.pinchStart(x, y, z, dx, dy, dz, options)
		return this
	}

	pinchTo(
		x = this.inputs.getCurrentScreenPoint().x,
		y = this.inputs.getCurrentScreenPoint().y,
		z: number,
		dx: number,
		dy: number,
		dz: number,
		options = {} as Partial<Omit<TLPinchEventInfo, 'point' | 'delta' | 'offset'>>
	) {
		this.controller.pinchTo(x, y, z, dx, dy, dz, options)
		return this
	}

	pinchEnd(
		x = this.inputs.getCurrentScreenPoint().x,
		y = this.inputs.getCurrentScreenPoint().y,
		z: number,
		dx: number,
		dy: number,
		dz: number,
		options = {} as Partial<Omit<TLPinchEventInfo, 'point' | 'delta' | 'offset'>>
	) {
		this.controller.pinchEnd(x, y, z, dx, dy, dz, options)
		return this
	}

	/* ---- Delegated to Macropad: interaction helpers ---- */

	rotateSelection(
		angleRadians: number,
		{
			handle = 'top_left_rotate',
			shiftKey = false,
		}: { handle?: RotateCorner; shiftKey?: boolean } = {}
	) {
		this.controller.rotateSelection(angleRadians, { handle, shiftKey })
		return this
	}

	translateSelection(dx: number, dy: number, options?: Partial<TLPointerEventInfo>) {
		this.controller.translateSelection(dx, dy, options)
		return this
	}

	resizeSelection(
		{ scaleX = 1, scaleY = 1 },
		handle: SelectionHandle,
		options?: Partial<TLPointerEventInfo>
	) {
		this.controller.resizeSelection({ scaleX, scaleY }, handle, options)
		return this
	}

	/* ---- Test-specific (not delegated) ---- */

	createShapesFromJsx(shapesJsx: React.JSX.Element | React.JSX.Element[]) {
		const { shapes, assets, ids, bindings } = shapesFromJsx(shapesJsx)
		this.createAssets(assets)
		this.createShapes(shapes)
		this.createBindings(bindings)
		return ids
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
