import {
	BaseBoxShapeUtil,
	BaseFrameLikeShapeUtil,
	DefaultDashStyle,
	RecordProps,
	T,
	TLBaseShape,
	createShapeId,
	getColorValue,
	toRichText,
} from '@tldraw/editor'
import { vi } from 'vitest'
import { FrameShapeUtil } from '../../lib/shapes/frame/FrameShapeUtil'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	boxA: createShapeId('boxA'),
	boxB: createShapeId('boxB'),
	boxC: createShapeId('boxC'),
}

const parser = new DOMParser()
function parseSvg({ svg }: { svg: string } = { svg: '' }) {
	return parser.parseFromString(svg, 'image/svg+xml').firstElementChild as SVGSVGElement
}

vi.useRealTimers()

beforeEach(() => {
	editor = new TestEditor()
	editor.setStyleForNextShapes(DefaultDashStyle, 'solid')
	editor.setStyleForSelectedShapes(DefaultDashStyle, 'solid')
	editor.createShapes([
		{
			id: ids.boxA,
			type: 'geo',
			x: 0,
			y: 0,
			props: {
				w: 100,
				h: 100,
				richText: toRichText('Hello world'),
			},
		},
		{
			id: ids.boxB,
			type: 'geo',
			x: 100,
			y: 100,
			props: {
				w: 50,
				h: 50,
			},
		},
		{
			id: ids.boxC,
			type: 'geo',
			x: 400,
			y: 400,
			props: {
				w: 100,
				h: 100,
				fill: 'pattern',
			},
		},
	])
	editor.selectAll()
})

it('gets an SVG', async () => {
	const svg = await editor.getSvgString(editor.getSelectedShapeIds())

	expect(svg!.width).toBe(564)
	expect(svg!.height).toBe(564)
	expect(svg!.svg).toMatch(/^<svg/)
})

it('Returns all shapes when no ids are provided', async () => {
	const svg = parseSvg(await editor.getSvgString([]))

	const elm = document.createElement('wrapper')
	elm.appendChild(svg)

	expect(elm).toMatchSnapshot('All shapes')
})

it('Gets the bounding box at the correct size', async () => {
	const svg = await editor.getSvgString(editor.getSelectedShapeIds())
	const parsed = parseSvg(svg!)
	const bbox = editor.getSelectionRotatedPageBounds()!
	const expanded = bbox.expandBy(editor.options.defaultSvgPadding) // adds 32px padding

	expect(parsed.getAttribute('width')).toMatch(expanded.width + '')
	expect(parsed.getAttribute('height')).toMatch(expanded.height + '')
	expect(svg!.width).toBe(expanded.width)
	expect(svg!.height).toBe(expanded.height)
})

it('Matches a snapshot', async () => {
	const svg = parseSvg(await editor.getSvgString(editor.getSelectedShapeIds()))

	const elm = document.createElement('wrapper')
	elm.appendChild(svg)

	expect(elm).toMatchSnapshot('Basic SVG')
})

it('Accepts a scale option', async () => {
	const svg1 = (await editor.getSvgString(editor.getSelectedShapeIds(), { scale: 1 }))!

	expect(svg1.width).toBe(564)

	const svg2 = (await editor.getSvgString(editor.getSelectedShapeIds(), { scale: 2 }))!

	expect(svg2.width).toBe(1128)
})

it.each([
	{ darkMode: false, label: 'light mode' },
	{ darkMode: true, label: 'dark mode' },
])('emits matching pattern id and reference in $label export', async ({ darkMode }) => {
	const result = parseSvg(await editor.getSvgString([ids.boxC], { darkMode }))

	const patternIds = Array.from(result.querySelectorAll('pattern')).map((p) => p.id)
	expect(patternIds.length).toBeGreaterThan(0)

	const fillUrlIds = Array.from(result.querySelectorAll('path'))
		.map((p) => p.getAttribute('fill')?.match(/^url\(#(.+)\)$/)?.[1])
		.filter((id): id is string => Boolean(id))
	expect(fillUrlIds.length).toBeGreaterThan(0)

	for (const id of fillUrlIds) {
		expect(patternIds).toContain(id)
	}
})

it('Accepts a background option', async () => {
	const svg1 = parseSvg(
		await editor.getSvgString(editor.getSelectedShapeIds(), { background: true })
	)
	expect(svg1.style.backgroundColor).not.toBe('transparent')

	const svg2 = parseSvg(
		await editor.getSvgString(editor.getSelectedShapeIds(), { background: false })
	)
	expect(svg2.style.backgroundColor).toBe('transparent')
})

// Note: this test exports, which bumps a module-level id counter that the snapshot tests
// above are sensitive to - so keep it after them.
it('waits for required fonts to load before measuring the export', async () => {
	// Text geometry is measured from the loaded font, so the export must not be measured
	// until the fonts it uses have loaded.
	let resolveFonts!: () => void
	const fontsLoaded = new Promise<void>((resolve) => {
		resolveFonts = resolve
	})
	const loadFonts = vi
		.spyOn(editor.fonts, 'loadRequiredFontsForCurrentPage')
		.mockReturnValue(fontsLoaded)

	let resolved = false
	const exportPromise = editor.getSvgString(editor.getSelectedShapeIds()).then((result) => {
		resolved = true
		return result
	})

	// let the export run up to the font-loading await
	await new Promise((resolve) => setTimeout(resolve, 0))
	expect(loadFonts).toHaveBeenCalled()
	expect(resolved).toBe(false)

	resolveFonts()
	const svg = await exportPromise
	expect(resolved).toBe(true)
	expect(svg!.svg).toMatch(/^<svg/)
})

// Not registered in TLGlobalShapePropsMap: the tldraw test project already sits at TypeScript's
// discriminated-union limit for TLShapePartial, so one more augmentation breaks typecheck.
const BROKEN_EXPORT_TYPE = 'my-broken-export-shape'
const FRAME_LIKE_TYPE = 'my-frame-like-shape'

type MyBrokenExportShape = TLBaseShape<typeof BROKEN_EXPORT_TYPE, { w: number; h: number }>
type MyFrameLikeShape = TLBaseShape<typeof FRAME_LIKE_TYPE, { w: number; h: number }>

class BrokenExportShapeUtil extends BaseBoxShapeUtil<any> {
	static override type = BROKEN_EXPORT_TYPE
	static override props: RecordProps<MyBrokenExportShape> = { w: T.number, h: T.number }
	override getDefaultProps() {
		return { w: 100, h: 100 }
	}
	override component() {
		return null as any
	}
	override getIndicatorPath() {
		return undefined
	}
	override toSvg(): never {
		throw new Error('toSvg failed')
	}
}

class FrameLikeShapeUtil extends BaseFrameLikeShapeUtil<any> {
	static override type = FRAME_LIKE_TYPE
	static override props: RecordProps<MyFrameLikeShape> = { w: T.number, h: T.number }
	override getDefaultProps() {
		return { w: 100, h: 100 }
	}
	override component() {
		return null as any
	}
	override getIndicatorPath() {
		return undefined
	}
}

// jsdom serializes colors as rgb(), so compare against the same normalization
function toCssColor(color: string) {
	const el = document.createElement('div')
	el.style.backgroundColor = color
	return el.style.backgroundColor
}

it('rejects when a shape throws from toSvg instead of timing out with an empty export', async () => {
	const editor = new TestEditor({ shapeUtils: [BrokenExportShapeUtil] })
	const id = createShapeId('broken')
	editor.createShape({ id, type: BROKEN_EXPORT_TYPE, x: 0, y: 0, props: { w: 100, h: 100 } } as any)

	await expect(editor.getSvgString([id])).rejects.toThrow('toSvg failed')
})

it('takes a single frame-like export background from the shape util of that shape', async () => {
	const editor = new TestEditor({
		shapeUtils: [FrameShapeUtil.configure({ showColors: true }), FrameLikeShapeUtil],
	})
	const frameId = createShapeId('frame')
	const frameLikeId = createShapeId('frame-like')
	editor.createShape({
		id: frameId,
		type: 'frame',
		x: 0,
		y: 0,
		props: { w: 100, h: 100, color: 'red' },
	})
	editor.createShape({
		id: frameLikeId,
		type: FRAME_LIKE_TYPE,
		x: 200,
		y: 0,
		props: { w: 100, h: 100 },
	} as any)
	const colors = editor.getCurrentTheme().colors[editor.getColorMode()]

	const frameSvg = parseSvg(await editor.getSvgString([frameId], { background: true }))
	expect(frameSvg.style.backgroundColor).toBe(toCssColor(getColorValue(colors, 'red', 'frameFill')))

	// the custom frame-like shape has no color prop, so it gets the plain solid background
	// rather than a transparent one from reading the default frame util's options
	const frameLikeSvg = parseSvg(await editor.getSvgString([frameLikeId], { background: true }))
	expect(frameLikeSvg.style.backgroundColor).toBe(toCssColor(colors.solid))
})
