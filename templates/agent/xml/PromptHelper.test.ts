import { Box, createShapeId, Editor } from 'tldraw'
import { PromptHelper } from './PromptHelper'

describe('PromptHelper', () => {
	let editor: Editor
	let promptHelper: PromptHelper

	beforeEach(() => {
		editor = {
			getTextOptions() {
				return {
					tipTapConfig: null,
				}
			},
			getViewportPageBounds: jest.fn(),
			getCurrentPageShapeIdsSorted: jest.fn(),
			getShape: jest.fn(),
			getShapePageBounds: jest.fn(),
			toImage: jest.fn(),
			getCurrentPageShapesSorted: jest.fn(),
		} as any
		promptHelper = new PromptHelper(editor, 'test prompt')
	})

	it('should be defined', () => {
		expect(promptHelper).toBeDefined()
	})

	describe('getCanvasContents', () => {
		it('should return the canvas contents', () => {
			const shapes = [
				{ id: createShapeId('1'), type: 'geo', props: { geo: 'rectangle' } },
				{ id: createShapeId('2'), type: 'text', props: { richText: { type: 'doc', content: [] } } },
			]
			const bounds = new Box(0, 0, 100, 100)
			editor.getCurrentPageShapesSorted = jest.fn().mockReturnValue(shapes)
			editor.getShapePageBounds = jest.fn().mockReturnValue(bounds)

			const contents = promptHelper.getCanvasContents()

			expect(contents).toEqual([
				{
					id: '1',
					type: 'rectangle',
					index: 0,
					minX: bounds.minX,
					minY: bounds.minY,
					maxX: bounds.maxX,
					maxY: bounds.maxY,
				},
				{
					id: '2',
					type: 'text',
					index: 1,
					minX: bounds.minX,
					minY: bounds.minY,
					maxX: bounds.maxX,
					maxY: bounds.maxY,
				},
			])
		})

		it('should sort the canvas contents by y then x', () => {
			const shapes = [
				{ id: createShapeId('1'), type: 'geo', index: 1, props: { geo: 'rectangle' } },
				{
					id: createShapeId('2'),
					type: 'text',
					index: 2,
					props: { richText: { type: 'doc', content: [] } },
				},
				{ id: createShapeId('3'), type: 'geo', index: 3, props: { geo: 'rectangle' } },
			]
			const bounds1 = new Box(100, 100, 100, 100)
			const bounds2 = new Box(0, 0, 100, 100)
			const bounds3 = new Box(200, 200, 100, 100)
			editor.getCurrentPageShapesSorted = jest.fn().mockReturnValue(shapes)
			editor.getShapePageBounds = jest.fn((id) => {
				if (id === createShapeId('1')) {
					return bounds1
				}
				if (id === createShapeId('2')) {
					return bounds2
				}
				if (id === createShapeId('3')) {
					return bounds3
				}
				return bounds2
			})

			const contents = promptHelper.getCanvasContents()

			expect(contents).toEqual([
				{
					id: '2',
					type: 'text',
					index: 1,
					minX: bounds2.minX,
					minY: bounds2.minY,
					maxX: bounds2.maxX,
					maxY: bounds2.maxY,
				},
				{
					id: '1',
					type: 'rectangle',
					index: 0,
					minX: bounds1.minX,
					minY: bounds1.minY,
					maxX: bounds1.maxX,
					maxY: bounds1.maxY,
				},
				{
					id: '3',
					type: 'rectangle',
					index: 2,
					minX: bounds3.minX,
					minY: bounds3.minY,
					maxX: bounds3.maxX,
					maxY: bounds3.maxY,
				},
			])
		})
	})

	describe('getPromptXml', () => {
		it('should return the prompt xml', () => {
			const info = {
				viewport: { id: 'viewport', minX: 0, minY: 0, maxX: 100, maxY: 100 },
				contents: [
					{
						id: '1',
						type: 'rectangle',
						index: 1,
						minX: 0,
						minY: 0,
						maxX: 100,
						maxY: 100,
					},
					{
						id: '2',
						type: 'text',
						index: 2,
						minX: 0,
						minY: 0,
						maxX: 100,
						maxY: 100,
					},
				],
				image: '',
				prompt: '',
			}

			const xml = promptHelper.getPromptXml(info)

			expect(xml).toBe(`
<prompt>
  <viewport>viewport</viewport>
  <canvas>
    <shape-stub id="1" type="rectangle" index="1" minX="0" minY="0" maxX="100" maxY="100" />
<shape-stub id="2" type="text" index="2" minX="0" minY="0" maxX="100" maxY="100" />
  </canvas>
</prompt>`)
		})
	})

	describe('getShapeInfo', () => {
		it('should return the shape info for a geo shape', () => {
			const shape = {
				id: createShapeId('1'),
				type: 'geo',
				index: 1,
				x: 0,
				y: 0,
				props: { w: 100, h: 100, color: 'red' },
			}
			editor.getShape = jest.fn().mockReturnValue(shape)

			const info = promptHelper.getShapeFullXml(createShapeId('1'))

			expect(info).toBe(
				'<geo id="shape:1" x="0" y="0" width="100" height="100" color="red" text="" fill="none"/>'
			)
		})

		it('should return the shape info for a text shape', () => {
			const shape = {
				id: createShapeId('1'),
				type: 'text',
				index: 1,
				x: 0,
				y: 0,
				props: {
					richText: {
						type: 'doc',
						content: [
							{
								type: 'paragraph',
								attrs: {
									dir: 'auto',
								},
								content: [
									{
										type: 'text',
										text: 'hi',
									},
								],
							},
						],
					},
					color: 'red',
				},
			}
			editor.getShape = jest.fn().mockReturnValue(shape)

			const info = promptHelper.getShapeFullXml(createShapeId('1'))

			expect(info).toBe('<text id="shape:1" x="0" y="0" text="hi" color="red"/>')
		})

		it('should return null for an unknown shape type', () => {
			const shape = { id: createShapeId('1'), type: 'unknown' }
			editor.getShape = jest.fn().mockReturnValue(shape)

			const info = promptHelper.getShapeFullXml(createShapeId('1'))

			expect(info).toBeNull()
		})
	})
})
