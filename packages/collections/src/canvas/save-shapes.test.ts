import {
	Editor,
	createShapeId,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	type TLImageExportOptions,
	type TLShapeId,
} from 'tldraw'
import { InMemoryCollectionSource } from '../lib/InMemoryCollectionSource'
import { saveShapesToCollection } from './save-shapes'

const frameId = createShapeId('frame')
const childId = createShapeId('child')
const emptyFrameId = createShapeId('empty')
const boxId = createShapeId('box')
const bigBoxId = createShapeId('big')

let editor: Editor
let exported: { svg: SVGSVGElement; darkMode?: boolean; pixels: number }[]

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
	])
	// jsdom can't rasterise, so the thumbnails are checked as the SVG the PNG would be made from.
	exported = []
	editor.toImage = async (ids, opts: TLImageExportOptions = {}) => {
		const result = await editor.getSvgString(ids as TLShapeId[], opts)
		const svg = new DOMParser().parseFromString(result!.svg, 'image/svg+xml')
			.firstElementChild as SVGSVGElement
		// The longest side of the PNG this SVG would be rasterised to.
		const pixels = Math.max(result!.width, result!.height) * (opts.pixelRatio ?? 2)
		exported.push({ svg, darkMode: opts.darkMode, pixels })
		return { blob: new Blob([result!.svg]), width: result!.width, height: result!.height }
	}
})

afterEach(() => editor.dispose())

async function save(shapeIds: TLShapeId[]) {
	const source = new InMemoryCollectionSource()
	const collection = await source.createCollection('Kit')
	await saveShapesToCollection(editor, source, collection.id, shapeIds)
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

it('caps a big item’s thumbnail at 512 pixels', async () => {
	for (const { pixels } of await save([bigBoxId])) {
		expect(pixels).toBeLessThanOrEqual(512)
		expect(pixels).toBeGreaterThan(500)
	}
})

it('keeps a small item’s thumbnail as sharp as before', async () => {
	const [{ svg, pixels }] = await save([boxId])
	expect(pixels).toBe(
		Math.max(Number(svg.getAttribute('width')), Number(svg.getAttribute('height'))) * 2
	)
})
