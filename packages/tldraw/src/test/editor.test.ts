import { TestEditor } from './TestEditor'

describe('editor', () => {
	let editor: TestEditor

	beforeEach(() => {
		editor = new TestEditor()
	})

	describe('editor.getShapePageBounds', () => {
		it('calculates axis aligned bounds correctly', () => {
			editor.createShape({
				type: 'geo',
				x: 99,
				y: 88,
				props: {
					w: 199,
					h: 188,
				},
			})
			const shape = editor.getLastCreatedShape()
			expect(editor.getShapePageBounds(shape)!).toMatchInlineSnapshot(`
		Box {
		  "h": 188,
		  "w": 199,
		  "x": 99,
		  "y": 88,
		}
	`)
		})

		it('calculates rotated bounds correctly', () => {
			editor.createShape({
				type: 'geo',
				x: 99,
				y: 88,
				rotation: Math.PI / 4,
				props: {
					w: 199,
					h: 188,
				},
			})
			const shape = editor.getLastCreatedShape()
			expect(editor.getShapePageBounds(shape)!).toMatchInlineSnapshot(`
		Box {
		  "h": 273.65032431919394,
		  "w": 273.6503243191939,
		  "x": -33.93607486307093,
		  "y": 88,
		}
	`)
		})

		it('calculates bounds based on vertices, not corners', () => {
			editor.createShape({
				type: 'geo',
				x: 99,
				y: 88,
				rotation: Math.PI / 4,
				props: {
					geo: 'ellipse',
					w: 199,
					h: 188,
				},
			})
			const shape = editor.getLastCreatedShape()
			expect(editor.getShapePageBounds(shape)!).toMatchInlineSnapshot(`
		Box {
		  "h": 193.49999999999997,
		  "w": 193.50000000000003,
		  "x": 6.139087296526014,
		  "y": 128.07516215959694,
		}
	`)
		})
	})
})
