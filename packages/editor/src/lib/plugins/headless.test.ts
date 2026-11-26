// @vitest-environment node
//
// A headless editor: no DOM, no React rendering. It runs in Node with only the plugins it is
// given. These tests also show how a plugin extends behavior that the core or another plugin owns.
import { RecordProps, TLShape, createShapeId } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { DEFAULT_CAMERA_OPTIONS } from '../constants'
import type { Editor } from '../editor/Editor'
import { ShapeUtil } from '../editor/shapes/ShapeUtil'
import { TLExternalContent } from '../editor/types/external-content'
import { Rectangle2d } from '../primitives/geometry/Rectangle2d'
import { cameraCapability } from './builtin/camera'
import { CameraController } from './builtin/CameraController'
import { domImageExportPlugin } from './builtin/domImageExport'
import {
	externalContentCapability,
	externalContentPlugin,
	externalContentSlot,
} from './builtin/externalContent'
import { canSnapToShapeSlot } from './builtin/snapping'
import { snappingPlugin } from './builtin/snappingPlugin'
import {
	approximateTextMeasurementPlugin,
	textMeasurementCapability,
} from './builtin/textMeasurement'
import { createEditor } from './createEditor'
import { createKernelPlugins } from './kernelPlugins'
import { TLPlugin, definePlugin } from './plugin'

const CARD = 'test-card'

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[CARD]: { text: string; snappable: boolean }
	}
}

type CardShape = TLShape<typeof CARD>

/** A shape whose size comes from its text, so geometry depends on the text measurement plugin. */
class CardShapeUtil extends ShapeUtil<CardShape> {
	static override type = CARD
	static override props: RecordProps<CardShape> = { text: T.string, snappable: T.boolean }
	getDefaultProps(): CardShape['props'] {
		return { text: '', snappable: true }
	}
	getGeometry(shape: CardShape) {
		const { w, h } = this.editor.textMeasure.measureText(shape.props.text, {
			fontStyle: 'normal',
			fontWeight: 'normal',
			fontFamily: 'sans-serif',
			fontSize: 10,
			lineHeight: 1,
			maxWidth: null,
			padding: '0px',
		})
		return new Rectangle2d({ width: Math.max(w, 10), height: Math.max(h, 10), isFilled: true })
	}
	component() {
		return null
	}
	getIndicatorPath() {
		return undefined
	}
}

const cardsPlugin = definePlugin({ id: 'cards', shapeUtils: [CardShapeUtil] })

// The kernel without the plugins that these tests install or leave out on purpose.
const kernelPlugins = createKernelPlugins().filter(
	(p) => p.id !== 'snapping' && p.id !== 'externalContent'
)

function headlessEditor(...plugins: TLPlugin[]) {
	return createEditor({
		plugins: [cardsPlugin, approximateTextMeasurementPlugin(), ...kernelPlugins, ...plugins],
	})
}

describe('a headless editor', () => {
	it('creates its store from the plugins and edits shapes with undo and redo', () => {
		const editor = headlessEditor()
		const id = createShapeId('card')

		editor.markHistoryStoppingPoint()
		editor.createShape<CardShape>({ id, type: CARD, x: 10, y: 20, props: { text: 'hello' } })
		// 5 characters × 10px × 0.6em = 30px wide, one 10px line.
		expect(editor.getShapePageBounds(id)).toMatchObject({ x: 10, y: 20, w: 30, h: 10 })

		editor.markHistoryStoppingPoint()
		editor.updateShape<CardShape>({ id, type: CARD, x: 100, props: { text: 'hello world' } })
		expect(editor.getShapePageBounds(id)).toMatchObject({ x: 100, w: 66 })

		editor.undo()
		expect(editor.getShapePageBounds(id)).toMatchObject({ x: 10, w: 30 })
		editor.undo()
		expect(editor.getShape(id)).toBeUndefined()
		editor.redo()
		expect(editor.getShape(id)).toBeDefined()
	})

	it('moves the camera and dispatches pointer events without a DOM', () => {
		const editor = headlessEditor()
		editor.setCamera({ x: 10, y: 20, z: 2 })
		// (100 / 2) - 10 = 40, (100 / 2) - 20 = 30
		expect(editor.screenToPage({ x: 100, y: 100 })).toMatchObject({ x: 40, y: 30 })

		editor.dispatch({
			type: 'pointer',
			name: 'pointer_move',
			target: 'canvas',
			point: { x: 100, y: 100 },
			pointerId: 1,
			button: 0,
			isPen: false,
			shiftKey: false,
			altKey: false,
			ctrlKey: false,
			metaKey: false,
			accelKey: false,
		})
		// The dispatcher batches pointer moves until the caller emits the next tick.
		editor.emit('tick', 16)
		expect(editor.inputs.getCurrentPagePoint()).toMatchObject({ x: 40, y: 30 })
	})

	it('uses a replacement kernel plugin', () => {
		const lockedCameraPlugin = definePlugin({
			id: 'lockedCamera',
			provides: [cameraCapability],
			setup(ctx) {
				ctx.provide(
					cameraCapability,
					new CameraController(ctx.editor, { ...DEFAULT_CAMERA_OPTIONS, isLocked: true })
				)
			},
		})
		const editor = createEditor({
			plugins: [
				cardsPlugin,
				approximateTextMeasurementPlugin(),
				...kernelPlugins.filter((p) => p.id !== 'camera'),
				lockedCameraPlugin,
			],
		})
		editor.setCamera({ x: 100, y: 100 })
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0 })
	})

	it('edits and undoes without event dispatch, and names it when an event arrives', () => {
		const editor = createEditor({
			plugins: [
				cardsPlugin,
				approximateTextMeasurementPlugin(),
				...kernelPlugins.filter((p) => p.id !== 'eventDispatch'),
			],
		})
		const id = createShapeId('card')
		editor.markHistoryStoppingPoint()
		editor.createShape<CardShape>({ id, type: CARD, props: { text: 'a' } })
		editor.undo()
		expect(editor.getShape(id)).toBeUndefined()
		expect(() => editor.cancel()).not.toThrow()
		expect(() => editor.dispatch({ type: 'misc', name: 'cancel' })).toThrow(
			'No installed plugin provides "eventDispatch"'
		)
		editor.dispose()
	})

	it.each([
		['styles', (editor: Editor) => editor.getSharedStyles()],
		['shapeArrangement', (editor: Editor) => editor.flipShapes([], 'horizontal')],
		['shapeAnimation', (editor: Editor) => editor.animateShapes([])],
	] as const)(
		'creates, edits, deletes and undoes without %s, and names it when used',
		(id, use) => {
			const editor = createEditor({
				plugins: [
					cardsPlugin,
					approximateTextMeasurementPlugin(),
					...kernelPlugins.filter((p) => p.id !== id),
				],
			})
			const shapeId = createShapeId('card')
			editor.markHistoryStoppingPoint()
			editor.createShape<CardShape>({ id: shapeId, type: CARD, props: { text: 'a' } })
			editor.markHistoryStoppingPoint()
			editor.updateShape<CardShape>({ id: shapeId, type: CARD, props: { text: 'b' } })
			editor.markHistoryStoppingPoint()
			editor.deleteShape(shapeId)
			editor.undo()
			editor.undo()
			expect(editor.getShape<CardShape>(shapeId)?.props.text).toBe('a')
			editor.redo()
			expect(editor.getShape<CardShape>(shapeId)?.props.text).toBe('b')
			expect(() => use(editor)).toThrow(`No installed plugin provides "${id}"`)
			editor.dispose()
		}
	)

	it('keeps focus as instance state without a DOM focus plugin', () => {
		const editor = headlessEditor()
		editor.focus()
		expect(editor.getIsFocused()).toBe(true)
		editor.blur()
		expect(editor.getIsFocused()).toBe(false)
	})

	it('lets a plugin use the legacy editor API in setup, after the plugins that it requires', async () => {
		const handled: string[] = []
		let measuredWidth = 0
		const legacyStylePlugin = definePlugin({
			id: 'legacyStyle',
			requires: [externalContentCapability, textMeasurementCapability],
			setup(ctx) {
				ctx.editor.registerExternalContentHandler('text', (info) => {
					handled.push(info.text)
				})
				measuredWidth = ctx.editor.textMeasure.measureText('abc', {
					fontStyle: 'normal',
					fontWeight: 'normal',
					fontFamily: 'sans-serif',
					fontSize: 10,
					lineHeight: 1,
					maxWidth: null,
					padding: '0px',
				}).w
			},
		})
		// List the user before the provider: the host still sets up the provider first.
		const editor = headlessEditor(legacyStylePlugin, externalContentPlugin)
		await editor.putExternalContent({ type: 'text', text: 'pasted' })
		expect(handled).toEqual(['pasted'])
		expect(measuredWidth).toBe(18)
	})

	it('names the missing plugin when a feature is used without it', () => {
		const editor = headlessEditor()
		expect(() => editor.snaps.getSnappableShapes()).toThrow(
			'No installed plugin provides "snapping"'
		)
		return Promise.all([
			expect(editor.getSvgElement([createShapeId('x')])).rejects.toThrow(
				'No installed plugin provides "svgExport"'
			),
			expect(editor.toImage([createShapeId('x')])).rejects.toThrow(
				'No installed plugin provides "imageExport"'
			),
		])
	})

	it('names the missing kernel plugin when the editor needs it', () => {
		const editor = createEditor({ plugins: [cardsPlugin, approximateTextMeasurementPlugin()] })
		expect(() => editor.inputs.getCurrentPagePoint()).toThrow(
			'No installed plugin provides "inputs"'
		)
		expect(() => editor.getCurrentTheme()).toThrow('No installed plugin provides "themes"')
		expect(() => editor.setCamera({ x: 0, y: 0 })).toThrow('No installed plugin provides "camera"')
	})

	it('refuses DOM image export without an SVG exporter', () => {
		expect(() => headlessEditor(domImageExportPlugin)).toThrow(
			'Plugin "domImageExport" requires "svgExport", but no installed plugin provides it.'
		)
	})

	it('reports no external asset handler without the external content plugin', () => {
		expect(headlessEditor().hasExternalAssetHandler('file')).toBe(false)
	})

	it('has the legacy facades while a plugin sets up', () => {
		let snaps: unknown
		const editor = headlessEditor(
			definePlugin({
				id: 'readsFacadesEarly',
				setup(ctx) {
					snaps = ctx.editor.snaps
				},
			})
		)
		expect(snaps).toBeDefined()
		expect(() => editor.snaps.getSnappableShapes()).toThrow(
			'No installed plugin provides "snapping"'
		)
	})
})

describe('the snapping plugin', () => {
	function setup(...plugins: TLPlugin[]) {
		const editor = headlessEditor(snappingPlugin, ...plugins)
		const a = createShapeId('a')
		const b = createShapeId('b')
		editor.createShapes<CardShape>([
			{ id: a, type: CARD, x: 0, y: 0, props: { text: 'a', snappable: true } },
			{ id: b, type: CARD, x: 50, y: 0, props: { text: 'b', snappable: false } },
		])
		return { editor, a, b }
	}

	it('uses ShapeUtil.canSnap when no plugin contributes', () => {
		const { editor, a, b } = setup()
		expect([...editor.snaps.getSnappableShapes()]).toEqual([a, b])
	})

	it('lets another plugin decide which shapes are snap targets', () => {
		const snapOnlyToSnappableCards = definePlugin({
			id: 'snapOnlyToSnappableCards',
			setup(ctx) {
				ctx.contribute(canSnapToShapeSlot, (canSnap, shape) =>
					shape.type === CARD ? canSnap && (shape as CardShape).props.snappable : canSnap
				)
			},
		})
		const { editor, a } = setup(snapOnlyToSnappableCards)
		expect([...editor.snaps.getSnappableShapes()]).toEqual([a])
	})
})

describe('the external content plugin', () => {
	const url = (u: string): TLExternalContent<unknown> => ({ type: 'url', url: u })

	it('runs plugin handlers before the handler registered with the legacy API', async () => {
		const handled: string[] = []
		const youTube = definePlugin({
			id: 'youTube',
			setup(ctx) {
				ctx.contribute(externalContentSlot, (info, next) => {
					if (info.type !== 'url' || !info.url.includes('youtube.com')) return next(info)
					handled.push(`youTube:${info.url}`)
				})
			},
		})
		const editor = headlessEditor(externalContentPlugin, youTube)
		editor.registerExternalContentHandler('url', (info) => {
			handled.push(`default:${info.url}`)
		})

		await editor.putExternalContent(url('https://youtube.com/watch?v=1'))
		await editor.putExternalContent(url('https://example.com'))
		expect(handled).toEqual([
			'youTube:https://youtube.com/watch?v=1',
			'default:https://example.com',
		])
	})

	it('keeps the legacy handler map readable, so code that wraps a handler still works', async () => {
		const handled: string[] = []
		const editor = headlessEditor(externalContentPlugin)
		editor.registerExternalContentHandler('url', () => {
			handled.push('first')
		})
		const previous = editor.externalContentHandlers['url']
		editor.registerExternalContentHandler('url', (info) => {
			handled.push('wrapper')
			previous?.(info)
		})
		await editor.putExternalContent(url('https://example.com'))
		expect(handled).toEqual(['wrapper', 'first'])
	})
})
