import {
	Editor,
	createShapeId,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	type TLImageExportOptions,
	type TLShapeId,
} from 'tldraw'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
import { saveShapesToLibrary } from './save-shapes'

const frameId = createShapeId('frame')
const childId = createShapeId('child')
const emptyFrameId = createShapeId('empty')
const boxId = createShapeId('box')
const bigBoxId = createShapeId('big')
const tinyBoxId = createShapeId('tiny')

let editor: Editor
let exported: { svg: SVGSVGElement; darkMode?: boolean; pixels: number; renderPixels: number }[]

beforeEach(() => {
	editor = new Editor({
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [],
		store: createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils }),
		getContainer: () => document.body,
	})
	// jsdom has no layout: text is measured as half its font size per character.
	const measure = (text: string, fontSize: number) => {
		const w = text.length * (fontSize / 2)
		return { x: 0, y: 0, w, h: fontSize, scrollWidth: w }
	}
	editor.textMeasure.measureText = (text, opts) => measure(text, opts.fontSize)
	editor.textMeasure.measureTextSpans = (text, opts) => [
		{ box: measure(text, opts.fontSize), text },
	]
	editor.createShapes([
		{ id: frameId, type: 'frame', x: 0, y: 0, props: { w: 320, h: 220, name: 'Login card' } },
		{ id: childId, type: 'geo', parentId: frameId, x: 40, y: 40, props: { w: 100, h: 50 } },
		{ id: emptyFrameId, type: 'frame', x: 0, y: 400, props: { w: 200, h: 100, name: 'Empty' } },
		{ id: boxId, type: 'geo', x: 500, y: 0, props: { w: 100, h: 100 } },
		{ id: bigBoxId, type: 'geo', x: 0, y: 1000, props: { w: 4000, h: 1000 } },
		{ id: tinyBoxId, type: 'geo', x: 0, y: 3000, props: { w: 4, h: 4 } },
	])
	// jsdom can't rasterise, so the thumbnails are checked as the SVG the PNG would be made from.
	exported = []
	editor.toImage = async (ids, opts: TLImageExportOptions = {}) => {
		const result = await editor.getSvgString(ids as TLShapeId[], opts)
		const svg = new DOMParser().parseFromString(result!.svg, 'image/svg+xml')
			.firstElementChild as SVGSVGElement
		const ratio = opts.pixelRatio ?? 2
		// The longest side of the canvas this SVG is drawn on, and of the PNG once trimmed: an
		// export without a fixed padding is cropped to its content, which jsdom can't do.
		const renderPixels = Math.max(result!.width, result!.height) * ratio
		const trimmed = typeof opts.padding === 'number' ? 0 : editor.options.defaultSvgPadding * 2
		const pixels = (Math.max(result!.width, result!.height) - trimmed) * ratio
		exported.push({ svg, darkMode: opts.darkMode, pixels, renderPixels })
		return { blob: new Blob([result!.svg]), width: result!.width, height: result!.height }
	}
})

afterEach(() => editor.dispose())

async function save(shapeIds: TLShapeId[]) {
	const source = new InMemoryLibrarySource()
	const library = await source.createLibrary('Kit')
	await saveShapesToLibrary(editor, source, library.id, shapeIds)
	return exported
}

const viewBoxTop = (svg: SVGSVGElement) => Number(svg.getAttribute('viewBox')!.split(' ')[1])

it('renders a frame as the frame, border and name, not as a slide of its contents', async () => {
	const thumbnails = await save([frameId])
	expect(thumbnails.map((t) => t.darkMode)).toEqual([false, true])
	for (const { svg } of thumbnails) {
		// The name sits above the frame's top edge, at y 0.
		expect(viewBoxTop(svg)).toBeLessThan(-10)
		expect(svg.textContent).toMatch(/Login\scard/)
		expect(svg.querySelector('path')).not.toBeNull() // the child
	}
})

it('renders a frame the same whatever the zoom', async () => {
	editor.setCamera({ x: 0, y: 0, z: 0.25 })
	const [zoomedOut] = await save([frameId])
	exported = []
	editor.setCamera({ x: 0, y: 0, z: 4 })
	const [zoomedIn] = await save([frameId])
	expect(zoomedIn.svg.getAttribute('viewBox')).toBe(zoomedOut.svg.getAttribute('viewBox'))
	// The name's box sits about 28 units above the frame.
	expect(viewBoxTop(zoomedIn.svg)).toBeLessThanOrEqual(-28)
})

it('renders an empty frame as the frame, not as nothing', async () => {
	for (const { svg } of await save([emptyFrameId])) {
		expect(svg.textContent).toContain('Empty')
	}
})

it('renders other shapes as the export draws them', async () => {
	for (const { svg } of await save([boxId])) {
		expect(svg.querySelector('rect')).toBeNull()
		expect(svg.querySelector('path')).not.toBeNull()
	}
})

it('zooms every item to the same size, big, small or a frame', async () => {
	for (const id of [bigBoxId, boxId, frameId]) {
		exported = []
		for (const { pixels } of await save([id])) expect(pixels).toBeCloseTo(512)
	}
})

it('keeps a tiny item’s canvas to a size a browser can draw', async () => {
	for (const { renderPixels } of await save([tinyBoxId])) {
		expect(renderPixels).toBeLessThanOrEqual(4096)
	}
})
