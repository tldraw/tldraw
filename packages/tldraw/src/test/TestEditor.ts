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
import { EditorController } from '@tldraw/editor-controller'
import { vi } from 'vitest'
import { defaultBindingUtils } from '../lib/defaultBindingUtils'
import { defaultShapeTools } from '../lib/defaultShapeTools'
import { defaultShapeUtils } from '../lib/defaultShapeUtils'
import { registerDefaultSideEffects } from '../lib/defaultSideEffects'
import { defaultTools } from '../lib/defaultTools'
import { defaultAddFontsFromNode, tipTapDefaultExtensions } from '../lib/utils/text/richText'

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
	controller: EditorController

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
		this.controller = new EditorController(this)

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

	/* ---- Delegated to EditorController ---- */

	getClipboard() {
		return this.controller.clipboard
	}
	setClipboard(value: TLContent | null) {
		this.controller.clipboard = value
	}
	getLastCreatedShapes(...args: Parameters<EditorController['getLastCreatedShapes']>) {
		return this.controller.getLastCreatedShapes(...args)
	}
	getLastCreatedShape<T extends TLShape>() {
		return this.controller.getLastCreatedShape<T>()
	}
	testShapeID(...args: Parameters<EditorController['testShapeID']>) {
		return this.controller.testShapeID(...args)
	}
	testPageID(...args: Parameters<EditorController['testPageID']>) {
		return this.controller.testPageID(...args)
	}
	copy(...args: Parameters<EditorController['copy']>) {
		this.controller.copy(...args)
		return this
	}
	cut(...args: Parameters<EditorController['cut']>) {
		this.controller.cut(...args)
		return this
	}
	paste(...args: Parameters<EditorController['paste']>) {
		this.controller.paste(...args)
		return this
	}
	getViewportPageCenter() {
		return this.controller.getViewportPageCenter()
	}
	getSelectionPageCenter() {
		return this.controller.getSelectionPageCenter()
	}
	getPageCenter(...args: Parameters<EditorController['getPageCenter']>) {
		return this.controller.getPageCenter(...args)
	}
	getPageRotationById(...args: Parameters<EditorController['getPageRotationById']>) {
		return this.controller.getPageRotationById(...args)
	}
	getPageRotation(...args: Parameters<EditorController['getPageRotation']>) {
		return this.controller.getPageRotation(...args)
	}
	getArrowsBoundTo(...args: Parameters<EditorController['getArrowsBoundTo']>) {
		return this.controller.getArrowsBoundTo(...args)
	}
	forceTick(...args: Parameters<EditorController['forceTick']>) {
		this.controller.forceTick(...args)
		return this
	}
	pointerMove(...args: Parameters<EditorController['pointerMove']>) {
		this.controller.pointerMove(...args)
		return this
	}
	pointerDown(...args: Parameters<EditorController['pointerDown']>) {
		this.controller.pointerDown(...args)
		return this
	}
	pointerUp(...args: Parameters<EditorController['pointerUp']>) {
		this.controller.pointerUp(...args)
		return this
	}
	click(...args: Parameters<EditorController['click']>) {
		this.controller.click(...args)
		return this
	}
	rightClick(...args: Parameters<EditorController['rightClick']>) {
		this.controller.rightClick(...args)
		return this
	}
	doubleClick(...args: Parameters<EditorController['doubleClick']>) {
		this.controller.doubleClick(...args)
		return this
	}
	keyPress(...args: Parameters<EditorController['keyPress']>) {
		this.controller.keyPress(...args)
		return this
	}
	keyDown(...args: Parameters<EditorController['keyDown']>) {
		this.controller.keyDown(...args)
		return this
	}
	keyRepeat(...args: Parameters<EditorController['keyRepeat']>) {
		this.controller.keyRepeat(...args)
		return this
	}
	keyUp(...args: Parameters<EditorController['keyUp']>) {
		this.controller.keyUp(...args)
		return this
	}
	wheel(...args: Parameters<EditorController['wheel']>) {
		this.controller.wheel(...args)
		return this
	}
	pan(...args: Parameters<EditorController['pan']>) {
		this.controller.pan(...args)
		return this
	}
	pinchStart(...args: Parameters<EditorController['pinchStart']>) {
		this.controller.pinchStart(...args)
		return this
	}
	pinchTo(...args: Parameters<EditorController['pinchTo']>) {
		this.controller.pinchTo(...args)
		return this
	}
	pinchEnd(...args: Parameters<EditorController['pinchEnd']>) {
		this.controller.pinchEnd(...args)
		return this
	}
	rotateSelection(...args: Parameters<EditorController['rotateSelection']>) {
		this.controller.rotateSelection(...args)
		return this
	}
	translateSelection(...args: Parameters<EditorController['translateSelection']>) {
		this.controller.translateSelection(...args)
		return this
	}
	resizeSelection(...args: Parameters<EditorController['resizeSelection']>) {
		this.controller.resizeSelection(...args)
		return this
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
