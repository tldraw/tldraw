import { DefaultDashStyle, TLGeoShape, createShapeId, toRichText } from '@tldraw/editor'
import { vi } from 'vitest'
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
	editor.createShapes<TLGeoShape>([
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
