import { createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})
afterEach(() => {
	editor?.dispose()
})

describe('When editing text', () => {
	it('preserves the top center when center aligned', () => {
		const id = createShapeId()
		editor.createShapes([
			{
				id,
				type: 'text',
				x: 0,
				y: 0,
				props: {
					text: 'Hello',
					align: 'middle',
					scale: 2,
				},
			},
		])
		const boundsA = editor.getShapePageBounds(id)
		editor.updateShapes([
			{
				id,
				type: 'text',
				props: {
					text: 'Hello\nworld!',
				},
			},
		])
		const boundsB = editor.getShapePageBounds(id)
		expect(boundsA!.x).not.toEqual(boundsB!.x)
		expect(boundsA!.y).toEqual(boundsB!.y)
		expect(boundsA!.midX).toEqual(boundsB!.midX)
		expect(boundsA!.midY).not.toEqual(boundsB!.midY)
		expect(boundsA!.maxX).not.toEqual(boundsB!.maxX)
		expect(boundsA!.maxY).not.toEqual(boundsB!.maxY)
	})

	it('preserved the right center when center aligned and rotated 90deg', () => {
		const id = createShapeId()
		editor.createShapes([
			{
				id,
				type: 'text',
				x: 0,
				y: 0,
				rotation: Math.PI / 2,
				props: {
					text: 'Hello',
					align: 'middle',
					scale: 2,
				},
			},
		])

		const boundsA = editor.getShapePageBounds(id)!
		editor.updateShapes([{ id, type: 'text', props: { text: 'Hello, world!' } }])
		const boundsB = editor.getShapePageBounds(id)!
		expect(boundsA.x).toBeCloseTo(boundsB.x)
		expect(boundsA.y).not.toBeCloseTo(boundsB.y)
		expect(boundsA.midX).toBeCloseTo(boundsB.midX)
		expect(boundsA.midY).toBeCloseTo(boundsB.midY)
	})

	it('preserves the top left corner when start aligned', () => {
		const id = createShapeId()
		editor.createShapes([
			{
				id,
				type: 'text',
				x: 0,
				y: 0,
				props: {
					text: 'Hello',
					align: 'start',
					scale: 2,
				},
			},
		])
		const boundsA = editor.getShapePageBounds(id)
		editor.updateShapes([
			{
				id,
				type: 'text',
				props: {
					text: 'Hello\nworld!',
				},
			},
		])
		const boundsB = editor.getShapePageBounds(id)
		expect(boundsA!.x).toEqual(boundsB!.x)
		expect(boundsA!.y).toEqual(boundsB!.y)
		expect(boundsA!.midX).not.toEqual(boundsB!.midX)
		expect(boundsA!.midY).not.toEqual(boundsB!.midY)
		expect(boundsA!.maxX).not.toEqual(boundsB!.maxX)
		expect(boundsA!.maxY).not.toEqual(boundsB!.maxY)
	})

	it('preserves the top right edge when end aligned', () => {
		const id = createShapeId()
		editor.createShapes([
			{
				id,
				type: 'text',
				x: 0,
				y: 0,
				props: {
					text: 'Hello',
					align: 'end',
					scale: 2,
				},
			},
		])
		const boundsA = editor.getShapePageBounds(id)
		editor.updateShapes([
			{
				id,
				type: 'text',
				props: {
					text: 'Hello\nworld!',
				},
			},
		])
		const boundsB = editor.getShapePageBounds(id)
		expect(boundsA!.x).not.toEqual(boundsB!.x)
		expect(boundsA!.y).toEqual(boundsB!.y)
		expect(boundsA!.midX).not.toEqual(boundsB!.midX)
		expect(boundsA!.midY).not.toEqual(boundsB!.midY)
		expect(boundsA!.maxX).toEqual(boundsB!.maxX)
		expect(boundsA!.maxY).not.toEqual(boundsB!.maxY)
	})
})

describe('When changing text size', () => {
	it('preserves the center when center aligned', () => {
		const id = createShapeId()
		editor.createShapes([
			{
				id,
				type: 'text',
				x: 0,
				y: 0,
				props: {
					text: 'Hello',
					size: 'm',
					align: 'middle',
					scale: 2,
				},
			},
		])
		const boundsA = editor.getShapePageBounds(id)
		editor.updateShapes([
			{
				id,
				type: 'text',
				props: {
					size: 'xl',
				},
			},
		])
		const boundsB = editor.getShapePageBounds(id)
		expect(boundsA!.x).not.toEqual(boundsB!.x)
		expect(boundsA!.y).not.toEqual(boundsB!.y)
		expect(boundsA!.midX).toEqual(boundsB!.midX)
		expect(boundsA!.midY).toEqual(boundsB!.midY)
		expect(boundsA!.maxX).not.toEqual(boundsB!.maxX)
		expect(boundsA!.maxY).not.toEqual(boundsB!.maxY)
	})

	it('preserves the center left point when start aligned', () => {
		const id = createShapeId()
		editor.createShapes([
			{
				id,
				type: 'text',
				x: 0,
				y: 0,
				props: {
					text: 'Hello',
					size: 'm',
					align: 'start',
					scale: 2,
				},
			},
		])
		const boundsA = editor.getShapePageBounds(id)
		editor.updateShapes([
			{
				id,
				type: 'text',
				props: {
					size: 'xl',
				},
			},
		])
		const boundsB = editor.getShapePageBounds(id)
		expect(boundsA!.x).toEqual(boundsB!.x)
		expect(boundsA!.y).not.toEqual(boundsB!.y)
		expect(boundsA!.midX).not.toEqual(boundsB!.midX)
		expect(boundsA!.midY).toEqual(boundsB!.midY)
		expect(boundsA!.maxX).not.toEqual(boundsB!.maxX)
		expect(boundsA!.maxY).not.toEqual(boundsB!.maxY)
	})

	it('preserves the top right edge when end aligned', () => {
		const id = createShapeId()
		editor.createShapes([
			{
				id,
				type: 'text',
				x: 0,
				y: 0,
				props: {
					text: 'Hello',
					size: 'm',
					align: 'end',
					scale: 2,
				},
			},
		])
		const boundsA = editor.getShapePageBounds(id)
		editor.updateShapes([
			{
				id,
				type: 'text',
				props: {
					size: 'xl',
				},
			},
		])
		const boundsB = editor.getShapePageBounds(id)
		expect(boundsA!.x).not.toEqual(boundsB!.x)
		expect(boundsA!.y).not.toEqual(boundsB!.y)
		expect(boundsA!.midX).not.toEqual(boundsB!.midX)
		expect(boundsA!.midY).toEqual(boundsB!.midY)
		expect(boundsA!.maxX).toEqual(boundsB!.maxX)
		expect(boundsA!.maxY).not.toEqual(boundsB!.maxY)
	})
})

it('preserves the top left when the text has text', () => {
	const x = 0
	const y = 0
	const id = createShapeId()
	editor.createShapes([
		{
			id,
			type: 'text',
			x: 0,
			y: 0,
			props: {
				text: 'Hello',
			},
		},
	])
	expect(editor.getShape(id)).toMatchObject({
		x,
		y,
	})
})
