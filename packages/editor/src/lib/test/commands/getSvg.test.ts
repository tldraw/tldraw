import { createCustomShapeId } from '@tldraw/tlschema'
import { SVG_PADDING } from '../../constants'
import { TestApp } from '../TestEditor'

let app: TestApp

const ids = {
	boxA: createCustomShapeId('boxA'),
	boxB: createCustomShapeId('boxB'),
	boxC: createCustomShapeId('boxC'),
}

beforeEach(() => {
	app = new TestApp()
	app.setProp('dash', 'solid')
	app.createShapes([
		{
			id: ids.boxA,
			type: 'geo',
			x: 0,
			y: 0,
			props: {
				w: 100,
				h: 100,
				text: 'Hello world',
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
			},
		},
	])
	app.selectAll()
})

it('gets an SVG', async () => {
	const svg = await app.getSvg(app.selectedIds)

	expect(svg).toBeTruthy()
})

it('Does not get an SVG when no ids are provided', async () => {
	const svg = await app.getSvg([])

	expect(svg).toBeFalsy()
})

it('Gets the bounding box at the correct size', async () => {
	const svg = await app.getSvg(app.selectedIds)
	const bbox = app.selectionBounds!
	const expanded = bbox.expandBy(SVG_PADDING) // adds 32px padding

	expect(svg!.getAttribute('width')).toMatch(expanded.width + '')
	expect(svg!.getAttribute('height')).toMatch(expanded.height + '')
})

it('Gets the bounding box at the correct size', async () => {
	const svg = (await app.getSvg(app.selectedIds))!
	const bbox = app.selectionBounds!
	const expanded = bbox.expandBy(SVG_PADDING) // adds 32px padding

	expect(svg!.getAttribute('width')).toMatch(expanded.width + '')
	expect(svg!.getAttribute('height')).toMatch(expanded.height + '')
})

it('Matches a snapshot', async () => {
	const svg = (await app.getSvg(app.selectedIds))!

	const elm = document.createElement('wrapper')
	elm.appendChild(svg)

	expect(elm).toMatchSnapshot('Basic SVG')
})

it('Accepts a scale option', async () => {
	const svg1 = (await app.getSvg(app.selectedIds, { scale: 1 }))!

	expect(svg1.getAttribute('width')).toBe('564')

	const svg2 = (await app.getSvg(app.selectedIds, { scale: 2 }))!

	expect(svg2.getAttribute('width')).toBe('1128')
})

it('Accepts a background option', async () => {
	const svg1 = (await app.getSvg(app.selectedIds, { background: true }))!

	expect(svg1.style.backgroundColor).not.toBe('transparent')

	const svg2 = (await app.getSvg(app.selectedIds, { background: false }))!

	expect(svg2.style.backgroundColor).toBe('transparent')
})
