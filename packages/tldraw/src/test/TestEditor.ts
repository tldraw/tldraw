import {
	Box,
	BoxModel,
	Editor,
	HALF_PI,
	IdOf,
	Mat,
	PageRecordType,
	ROTATE_CORNER_TO_SELECTION_CORNER,
	RequiredKeys,
	RotateCorner,
	SelectionHandle,
	TLArrowBinding,
	TLArrowShape,
	TLContent,
	TLEditorOptions,
	TLEventInfo,
	TLKeyboardEventInfo,
	TLPinchEventInfo,
	TLPointerEventInfo,
	TLShape,
	TLShapeId,
	TLShapePartial,
	TLStoreOptions,
	TLWheelEventInfo,
	Vec,
	VecLike,
	compact,
	computed,
	createShapeId,
	createTLStore,
	isAccelKey,
	rotateSelectionHandle,
	tlenv,
} from '@tldraw/editor'
import { defaultBindingUtils } from '../lib/defaultBindingUtils'
import { defaultShapeTools } from '../lib/defaultShapeTools'
import { defaultShapeUtils } from '../lib/defaultShapeUtils'
import { registerDefaultSideEffects } from '../lib/defaultSideEffects'
import { defaultTools } from '../lib/defaultTools'
import { shapesFromJsx } from './test-jsx'

jest.useFakeTimers()

Object.assign(navigator, {
	clipboard: {
		write: () => {
			//noop
		},
	},
})

// @ts-expect-error
window.ClipboardItem = class {}

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace jest {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		interface Matchers<R> {
			toCloselyMatchObject(value: any, precision?: number): void
		}
	}
}

export class TestEditor extends Editor {
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
		jest.spyOn(document.body, 'scrollWidth', 'get').mockImplementation(() => bounds.width)
		jest.spyOn(document.body, 'scrollHeight', 'get').mockImplementation(() => bounds.height)

		elm.tabIndex = 0
		elm.getBoundingClientRect = () => bounds as DOMRect

		const shapeUtilsWithDefaults = [...defaultShapeUtils, ...(options.shapeUtils ?? [])]
		const bindingUtilsWithDefaults = [...defaultBindingUtils, ...(options.bindingUtils ?? [])]

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
		})
		this.elm = elm
		this.bounds = bounds

		// Pretty hacky way to mock the screen bounds
		document.body.appendChild(this.elm)

		this.textMeasure.measureText = (
			textToMeasure: string,
			opts: {
				fontStyle: string
				fontWeight: string
				fontFamily: string
				fontSize: number
				lineHeight: number
				maxWidth: null | number
			}
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
					(opts.maxWidth === null ? breaks.length : Math.ceil(w % opts.maxWidth) + breaks.length) *
					opts.fontSize,
				scrollWidth: opts.maxWidth === null ? w : Math.max(w, opts.maxWidth),
			}
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

	/**
	 * The center of the viewport in the current page space.
	 *
	 * @public
	 */
	@computed getViewportPageCenter() {
		return this.getViewportPageBounds().center
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

	clipboard = null as TLContent | null

	copy(ids = this.getSelectedShapeIds()) {
		if (ids.length > 0) {
			const content = this.getContentFromCurrentPage(ids)
			if (content) {
				this.clipboard = content
			}
		}
		return this
	}

	cut(ids = this.getSelectedShapeIds()) {
		if (ids.length > 0) {
			const content = this.getContentFromCurrentPage(ids)
			if (content) {
				this.clipboard = content
			}
			this.deleteShapes(ids)
		}
		return this
	}

	paste(point?: VecLike) {
		if (this.clipboard !== null) {
			const p = this.inputs.shiftKey ? this.inputs.currentPagePoint : point

			this.markHistoryStoppingPoint('pasting')
			this.putContentOntoCurrentPage(this.clipboard, {
				point: p,
				select: true,
			})
		}
		return this
	}

	/**
	 * If you need to trigger a double click, you can either mock the implementation of one of these
	 * methods, or call mockRestore() to restore the actual implementation (e.g.
	 * _transformPointerDownSpy.mockRestore())
	 */
	_transformPointerDownSpy = jest
		.spyOn(this._clickManager, 'handlePointerEvent')
		.mockImplementation((info) => {
			return info
		})
	_transformPointerUpSpy = jest
		.spyOn(this._clickManager, 'handlePointerEvent')
		.mockImplementation((info) => {
			return info
		})

	testShapeID(id: string) {
		return createShapeId(id)
	}
	testPageID(id: string) {
		return PageRecordType.createId(id)
	}

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

	/* --------------------- Inputs --------------------- */

	protected getInfo<T extends TLEventInfo>(info: string | T): T {
		return typeof info === 'string'
			? ({
					target: 'shape',
					shape: this.getShape(info as any),
				} as T)
			: info
	}

	protected getPointerEventInfo(
		x = this.inputs.currentScreenPoint.x,
		y = this.inputs.currentScreenPoint.y,
		options?: Partial<TLPointerEventInfo> | TLShapeId,
		modifiers?: EventModifiers
	) {
		if (typeof options === 'string') {
			options = { target: 'shape', shape: this.getShape(options) }
		} else if (options === undefined) {
			options = { target: 'canvas' }
		}
		return {
			name: 'pointer_down',
			type: 'pointer',
			pointerId: 1,
			shiftKey: this.inputs.shiftKey,
			ctrlKey: this.inputs.ctrlKey,
			altKey: this.inputs.altKey,
			metaKey: this.inputs.metaKey,
			accelKey: isAccelKey({ ...this.inputs, ...modifiers }),
			point: { x, y, z: null },
			button: 0,
			isPen: false,
			...options,
			...modifiers,
		} as TLPointerEventInfo
	}

	protected getKeyboardEventInfo(
		key: string,
		name: TLKeyboardEventInfo['name'],
		options = {} as Partial<Exclude<TLKeyboardEventInfo, 'point'>>
	): TLKeyboardEventInfo {
		return {
			shiftKey: key === 'Shift',
			ctrlKey: key === 'Control' || key === 'Meta',
			altKey: key === 'Alt',
			metaKey: key === 'Meta',
			accelKey: tlenv.isDarwin ? key === 'Meta' : key === 'Control' || key === 'Meta',
			...options,
			name,
			code:
				key === 'Shift'
					? 'ShiftLeft'
					: key === 'Alt'
						? 'AltLeft'
						: key === 'Control'
							? 'CtrlLeft'
							: key === 'Meta'
								? 'MetaLeft'
								: key === ' '
									? 'Space'
									: key === 'Enter' ||
										  key === 'ArrowRight' ||
										  key === 'ArrowLeft' ||
										  key === 'ArrowUp' ||
										  key === 'ArrowDown'
										? key
										: 'Key' + key[0].toUpperCase() + key.slice(1),
			type: 'keyboard',
			key,
		}
	}

	/* ------------------ Input Events ------------------ */

	/**
	Some of our updates are not synchronous any longer. For example, drawing happens on tick instead of on pointer move.
	You can use this helper to force the tick, which will then process all the updates.
	*/
	forceTick(count = 1) {
		for (let i = 0; i < count; i++) {
			this.emit('tick', 16)
		}
		return this
	}

	pointerMove(
		x = this.inputs.currentScreenPoint.x,
		y = this.inputs.currentScreenPoint.y,
		options?: PointerEventInit,
		modifiers?: EventModifiers
	) {
		this.dispatch({
			...this.getPointerEventInfo(x, y, options, modifiers),
			name: 'pointer_move',
		}).forceTick()
		return this
	}

	pointerDown(
		x = this.inputs.currentScreenPoint.x,
		y = this.inputs.currentScreenPoint.y,
		options?: PointerEventInit,
		modifiers?: EventModifiers
	) {
		this.dispatch({
			...this.getPointerEventInfo(x, y, options, modifiers),
			name: 'pointer_down',
		}).forceTick()
		return this
	}

	pointerUp(
		x = this.inputs.currentScreenPoint.x,
		y = this.inputs.currentScreenPoint.y,
		options?: PointerEventInit,
		modifiers?: EventModifiers
	) {
		this.dispatch({
			...this.getPointerEventInfo(x, y, options, modifiers),
			name: 'pointer_up',
		}).forceTick()
		return this
	}

	click(
		x = this.inputs.currentScreenPoint.x,
		y = this.inputs.currentScreenPoint.y,
		options?: PointerEventInit,
		modifiers?: EventModifiers
	) {
		this.pointerDown(x, y, options, modifiers)
		this.pointerUp(x, y, options, modifiers)
		return this
	}

	rightClick(
		x = this.inputs.currentScreenPoint.x,
		y = this.inputs.currentScreenPoint.y,
		options?: PointerEventInit,
		modifiers?: EventModifiers
	) {
		this.dispatch({
			...this.getPointerEventInfo(x, y, options, modifiers),
			name: 'pointer_down',
			button: 2,
		}).forceTick()
		this.dispatch({
			...this.getPointerEventInfo(x, y, options, modifiers),
			name: 'pointer_up',
			button: 2,
		}).forceTick()
		return this
	}

	doubleClick(
		x = this.inputs.currentScreenPoint.x,
		y = this.inputs.currentScreenPoint.y,
		options?: PointerEventInit,
		modifiers?: EventModifiers
	) {
		this.pointerDown(x, y, options, modifiers)
		this.pointerUp(x, y, options, modifiers)
		this.dispatch({
			...this.getPointerEventInfo(x, y, options, modifiers),
			type: 'click',
			name: 'double_click',
			phase: 'down',
		})
		this.dispatch({
			...this.getPointerEventInfo(x, y, options, modifiers),
			type: 'click',
			name: 'double_click',
			phase: 'up',
		}).forceTick()
		return this
	}

	keyDown(key: string, options = {} as Partial<Exclude<TLKeyboardEventInfo, 'key'>>) {
		this.dispatch({ ...this.getKeyboardEventInfo(key, 'key_down', options) }).forceTick()
		return this
	}

	keyRepeat(key: string, options = {} as Partial<Exclude<TLKeyboardEventInfo, 'key'>>) {
		this.dispatch({ ...this.getKeyboardEventInfo(key, 'key_repeat', options) }).forceTick()
		return this
	}

	keyUp(key: string, options = {} as Partial<Omit<TLKeyboardEventInfo, 'key'>>) {
		this.dispatch({
			...this.getKeyboardEventInfo(key, 'key_up', {
				shiftKey: this.inputs.shiftKey && key !== 'Shift',
				ctrlKey: this.inputs.ctrlKey && !(key === 'Control' || key === 'Meta'),
				altKey: this.inputs.altKey && key !== 'Alt',
				metaKey: this.inputs.metaKey && key !== 'Meta',
				...options,
			}),
		}).forceTick()
		return this
	}

	wheel(dx: number, dy: number, options = {} as Partial<Omit<TLWheelEventInfo, 'delta'>>) {
		this.dispatch({
			type: 'wheel',
			name: 'wheel',
			point: new Vec(this.inputs.currentScreenPoint.x, this.inputs.currentScreenPoint.y),
			shiftKey: this.inputs.shiftKey,
			ctrlKey: this.inputs.ctrlKey,
			altKey: this.inputs.altKey,
			metaKey: this.inputs.metaKey,
			accelKey: isAccelKey(this.inputs),
			...options,
			delta: { x: dx, y: dy },
		}).forceTick(2)
		return this
	}

	pan(offset: VecLike): this {
		const { isLocked, panSpeed } = this.getCameraOptions()
		if (isLocked) return this
		const { x: cx, y: cy, z: cz } = this.getCamera()
		this.setCamera(new Vec(cx + (offset.x * panSpeed) / cz, cy + (offset.y * panSpeed) / cz, cz), {
			immediate: true,
		})
		return this
	}

	pinchStart(
		x = this.inputs.currentScreenPoint.x,
		y = this.inputs.currentScreenPoint.y,
		z: number,
		dx: number,
		dy: number,
		dz: number,
		options = {} as Partial<Omit<TLPinchEventInfo, 'point' | 'delta' | 'offset'>>
	) {
		this.dispatch({
			type: 'pinch',
			name: 'pinch_start',
			shiftKey: this.inputs.shiftKey,
			ctrlKey: this.inputs.ctrlKey,
			altKey: this.inputs.altKey,
			metaKey: this.inputs.metaKey,
			accelKey: isAccelKey(this.inputs),
			...options,
			point: { x, y, z },
			delta: { x: dx, y: dy, z: dz },
		}).forceTick()
		return this
	}

	pinchTo(
		x = this.inputs.currentScreenPoint.x,
		y = this.inputs.currentScreenPoint.y,
		z: number,
		dx: number,
		dy: number,
		dz: number,
		options = {} as Partial<Omit<TLPinchEventInfo, 'point' | 'delta' | 'offset'>>
	) {
		this.dispatch({
			type: 'pinch',
			name: 'pinch_start',
			shiftKey: this.inputs.shiftKey,
			ctrlKey: this.inputs.ctrlKey,
			altKey: this.inputs.altKey,
			metaKey: this.inputs.metaKey,
			accelKey: isAccelKey(this.inputs),
			...options,
			point: { x, y, z },
			delta: { x: dx, y: dy, z: dz },
		})
		return this
	}

	pinchEnd(
		x = this.inputs.currentScreenPoint.x,
		y = this.inputs.currentScreenPoint.y,
		z: number,
		dx: number,
		dy: number,
		dz: number,
		options = {} as Partial<Omit<TLPinchEventInfo, 'point' | 'delta' | 'offset'>>
	) {
		this.dispatch({
			type: 'pinch',
			name: 'pinch_end',
			shiftKey: this.inputs.shiftKey,
			ctrlKey: this.inputs.ctrlKey,
			altKey: this.inputs.altKey,
			metaKey: this.inputs.metaKey,
			accelKey: isAccelKey(this.inputs),
			...options,
			point: { x, y, z },
			delta: { x: dx, y: dy, z: dz },
		}).forceTick()
		return this
	}
	/* ------ Interaction Helpers ------ */

	rotateSelection(
		angleRadians: number,
		{
			handle = 'top_left_rotate',
			shiftKey = false,
		}: { handle?: RotateCorner; shiftKey?: boolean } = {}
	) {
		if (this.getSelectedShapeIds().length === 0) {
			throw new Error('No selection')
		}

		this.setCurrentTool('select')

		const handlePoint = this.getSelectionRotatedPageBounds()!
			.getHandlePoint(ROTATE_CORNER_TO_SELECTION_CORNER[handle])
			.clone()
			.rotWith(this.getSelectionRotatedPageBounds()!.point, this.getSelectionRotation())

		const targetHandlePoint = Vec.RotWith(handlePoint, this.getSelectionPageCenter()!, angleRadians)

		this.pointerDown(handlePoint.x, handlePoint.y, { target: 'selection', handle })
		this.pointerMove(targetHandlePoint.x, targetHandlePoint.y, { shiftKey })
		this.pointerUp()
		return this
	}

	/**
	 * The center of the selection bounding box.
	 *
	 * @readonly
	 * @public
	 */
	getSelectionPageCenter() {
		const selectionRotation = this.getSelectionRotation()
		const selectionBounds = this.getSelectionRotatedPageBounds()
		if (!selectionBounds) return null
		return Vec.RotWith(selectionBounds.center, selectionBounds.point, selectionRotation)
	}

	translateSelection(dx: number, dy: number, options?: Partial<TLPointerEventInfo>) {
		if (this.getSelectedShapeIds().length === 0) {
			throw new Error('No selection')
		}
		this.setCurrentTool('select')

		const center = this.getSelectionPageCenter()!

		this.pointerDown(center.x, center.y, this.getSelectedShapeIds()[0])
		const numSteps = 10
		for (let i = 1; i < numSteps; i++) {
			this.pointerMove(center.x + (i * dx) / numSteps, center.y + (i * dy) / numSteps, options)
		}
		this.pointerUp(center.x + dx, center.y + dy, options)
		return this
	}

	resizeSelection(
		{ scaleX = 1, scaleY = 1 },
		handle: SelectionHandle,
		options?: Partial<TLPointerEventInfo>
	) {
		if (this.getSelectedShapeIds().length === 0) {
			throw new Error('No selection')
		}
		this.setCurrentTool('select')
		const bounds = this.getSelectionRotatedPageBounds()!
		const preRotationHandlePoint = bounds.getHandlePoint(handle)

		const preRotationScaleOriginPoint = options?.altKey
			? bounds.center
			: bounds.getHandlePoint(rotateSelectionHandle(handle, Math.PI))

		const preRotationTargetHandlePoint = Vec.Add(
			Vec.Sub(preRotationHandlePoint, preRotationScaleOriginPoint).mulV({ x: scaleX, y: scaleY }),
			preRotationScaleOriginPoint
		)

		const handlePoint = Vec.RotWith(
			preRotationHandlePoint,
			bounds.point,
			this.getSelectionRotation()
		)
		const targetHandlePoint = Vec.RotWith(
			preRotationTargetHandlePoint,
			bounds.point,
			this.getSelectionRotation()
		)

		this.pointerDown(handlePoint.x, handlePoint.y, { target: 'selection', handle }, options)
		this.pointerMove(targetHandlePoint.x, targetHandlePoint.y, options)
		this.pointerUp(targetHandlePoint.x, targetHandlePoint.y, options)
		return this
	}

	createShapesFromJsx(
		shapesJsx: React.JSX.Element | React.JSX.Element[]
	): Record<string, TLShapeId> {
		const { shapes, assets, ids } = shapesFromJsx(shapesJsx)
		this.createAssets(assets)
		this.createShapes(shapes)
		return ids
	}

	/**
	 * Get the page point (or absolute point) of a shape.
	 *
	 * @example
	 * ```ts
	 * editor.getPagePoint(myShape)
	 * ```
	 *
	 * @param shape - The shape to get the page point for.
	 *
	 * @public
	 */
	getPageCenter(shape: TLShape) {
		const pageTransform = this.getShapePageTransform(shape.id)
		if (!pageTransform) return null
		const center = this.getShapeGeometry(shape).bounds.center
		return Mat.applyToPoint(pageTransform, center)
	}

	/**
	 * Get the page rotation (or absolute rotation) of a shape by its id.
	 *
	 * @example
	 * ```ts
	 * editor.getPageRotationById(myShapeId)
	 * ```
	 *
	 * @param id - The id of the shape to get the page rotation for.
	 */
	getPageRotationById(id: TLShapeId): number {
		const pageTransform = this.getShapePageTransform(id)
		if (pageTransform) {
			return Mat.Decompose(pageTransform).rotation
		}
		return 0
	}

	getPageRotation(shape: TLShape) {
		return this.getPageRotationById(shape.id)
	}

	getArrowsBoundTo(shapeId: TLShapeId) {
		const ids = new Set(
			this.getBindingsToShape<TLArrowBinding>(shapeId, 'arrow').map((b) => b.fromId)
		)
		return compact(Array.from(ids, (id) => this.getShape<TLArrowShape>(id)))
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

type PointerEventInit = Partial<TLPointerEventInfo> | TLShapeId
type EventModifiers = Partial<Pick<TLPointerEventInfo, 'shiftKey' | 'ctrlKey' | 'altKey'>>
