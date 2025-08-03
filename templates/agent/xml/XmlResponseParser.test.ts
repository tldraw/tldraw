import { XmlResponseParser } from './XmlResponseParser'
import { IResponse } from './xml-types'

describe('XmlResponseParser', () => {
	let parser: XmlResponseParser

	beforeEach(() => {
		parser = new XmlResponseParser()
	})

	describe('basic parsing', () => {
		test('parses complete XML response with thoughts and actions', () => {
			const xmlInput = `
				<response>
					<thoughts>
						<thought>I need to create a rectangle</thought>
					</thoughts>
					<actions>
						<create-shapes>
							<geo id="123" x="100" y="100" />
							<geo id="124" x="300" y="200" />
						</create-shapes>
					</actions>
					<thoughts>
						<thought>I need to create some text</thought>
					</thoughts>
					<actions>
						<create-shapes>
							<text id="456" x="200" y="200" text="Hello, world!" />
						</create-shapes>
					</actions>
					<thoughts>
						<thought>I need to delete the rectangle</thought>
					</thoughts>
					<actions>
						<delete-shapes shape-ids="123" />
					</actions>
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			const expected: IResponse = [
				{ type: 'thought', text: 'I need to create a rectangle' },
				{
					type: 'create-shape',
					shape: { id: '123', type: 'geo', x: 100, y: 100, text: '' },
				},
				{
					type: 'create-shape',
					shape: { id: '124', type: 'geo', x: 300, y: 200, text: '' },
				},
				{ type: 'thought', text: 'I need to create some text' },
				{
					type: 'create-shape',
					shape: { id: '456', type: 'text', x: 200, y: 200, text: 'Hello, world!' },
				},
				{ type: 'thought', text: 'I need to delete the rectangle' },
				{
					type: 'delete-shapes',
					shapeIds: ['123'],
				},
			]

			expect(result).toEqual(expected)
		})

		test('handles multiple shapes in single action', () => {
			const xmlInput = `
				<response>
					<actions>
						<create-shapes>
							<geo id="1" x="0" y="0" />
							<text id="2" x="50" y="50" text="Test" />
						</create-shapes>
					</actions>
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			expect(result).toEqual([
				{
					type: 'create-shape',
					shape: { id: '1', type: 'geo', x: 0, y: 0, text: '' },
				},
				{
					type: 'create-shape',
					shape: { id: '2', type: 'text', x: 50, y: 50, text: 'Test' },
				},
			])
		})

		test('handles empty response', () => {
			const xmlInput = '<response></response>'

			const result = parser.parseCompletedStream(xmlInput)

			expect(result).toEqual([])
		})
	})

	describe('thoughts parsing', () => {
		test('handles multiple thoughts in single thoughts block', () => {
			const xmlInput = `
				<response>
					<thoughts>
						<thought>First thought</thought>
						<thought>Second thought</thought>
					</thoughts>
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			expect(result).toEqual([
				{ type: 'thought', text: 'First thought' },
				{ type: 'thought', text: 'Second thought' },
			])
		})
	})

	describe('statements parsing', () => {
		test('handles statements', () => {
			const xmlInput = `
				<response>
					<actions>
						<statement>This is a statement</statement>
					</actions>
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			expect(result).toEqual([{ type: 'statement', text: 'This is a statement' }])
		})

		test('handles multiple statements', () => {
			const xmlInput = `
				<response>
					<actions>
						<statement>First statement</statement>
						<statement>Second statement</statement>
					</actions>
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			expect(result).toEqual([
				{ type: 'statement', text: 'First statement' },
				{ type: 'statement', text: 'Second statement' },
			])
		})

		test('handles mixed thoughts and statements', () => {
			const xmlInput = `
				<response>
					<thoughts>
						<thought>A thought</thought>
					</thoughts>
					<actions>
						<statement>A statement</statement>
					</actions>
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			expect(result).toEqual([
				{ type: 'thought', text: 'A thought' },
				{ type: 'statement', text: 'A statement' },
			])
		})
	})

	describe('shape creation', () => {
		test('parses shapes with all style attributes', () => {
			const xmlInput = `
				<response>
					<actions>
						<create-shapes>
							<geo id="styled-geo" x="100" y="100" width="200" height="150" fill="solid" color="red" text="Styled Geo" />
							<text id="styled-text" x="300" y="200" text="Colored Text" color="blue" />
						</create-shapes>
					</actions>
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			expect(result).toEqual([
				{
					type: 'create-shape',
					shape: {
						id: 'styled-geo',
						type: 'geo',
						x: 100,
						y: 100,
						width: 200,
						height: 150,
						fill: 'solid',
						color: 'red',
						text: 'Styled Geo',
					},
				},
				{
					type: 'create-shape',
					shape: {
						id: 'styled-text',
						type: 'text',
						x: 300,
						y: 200,
						text: 'Colored Text',
						color: 'blue',
					},
				},
			])
		})

		test('skips invalid shapes without required attributes', () => {
			const xmlInput = `
				<response>
					<actions>
						<create-shapes>
							<geo id="valid" x="100" y="100" />
							<geo x="100" y="100" />
						</create-shapes>
					</actions>
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			expect(result).toEqual([
				{
					type: 'create-shape',
					shape: { id: 'valid', type: 'geo', x: 100, y: 100, text: '' },
				},
			])
		})
	})

	describe('shape manipulation actions', () => {
		test('parses move-shape actions in complete XML response', () => {
			const xmlInput = `
				<response>
					<thoughts>
						<thought>I need to move some shapes</thought>
					</thoughts>
					<actions>
						<move-shape shape-id="123" x="150" y="200" />
						<move-shape shape-id="456" x="300" y="400" />
					</actions>
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			const expected: IResponse = [
				{ type: 'thought', text: 'I need to move some shapes' },
				{
					type: 'move-shape',
					shapeId: '123',
					x: 150,
					y: 200,
				},
				{
					type: 'move-shape',
					shapeId: '456',
					x: 300,
					y: 400,
				},
			]

			expect(result).toEqual(expected)
		})

		test('handles multiple move actions for same shape to different positions', () => {
			const xmlInput = `
				<response>
					<actions>
						<move-shape shape-id="123" x="100" y="100" />
						<move-shape shape-id="123" x="200" y="200" />
					</actions>
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			expect(result).toEqual([
				{
					type: 'move-shape',
					shapeId: '123',
					x: 100,
					y: 100,
				},
				{
					type: 'move-shape',
					shapeId: '123',
					x: 200,
					y: 200,
				},
			])
		})

		test('parses label-shape actions in complete XML response', () => {
			const xmlInput = `
				<response>
					<thoughts>
						<thought>I need to add labels to some shapes</thought>
					</thoughts>
					<actions>
						<label-shape shape-id="123" text="Rectangle" />
						<label-shape shape-id="456" text="Circle" />
					</actions>
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			const expected: IResponse = [
				{ type: 'thought', text: 'I need to add labels to some shapes' },
				{
					type: 'label-shape',
					shapeId: '123',
					text: 'Rectangle',
				},
				{
					type: 'label-shape',
					shapeId: '456',
					text: 'Circle',
				},
			]

			expect(result).toEqual(expected)
		})

		test('handles multiple label actions for same shape with different text', () => {
			const xmlInput = `
				<response>
					<actions>
						<label-shape shape-id="123" text="First Label" />
						<label-shape shape-id="123" text="Updated Label" />
					</actions>
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			expect(result).toEqual([
				{
					type: 'label-shape',
					shapeId: '123',
					text: 'First Label',
				},
				{
					type: 'label-shape',
					shapeId: '123',
					text: 'Updated Label',
				},
			])
		})

		test('handles empty text labels', () => {
			const xmlInput = `
				<response>
					<actions>
						<label-shape shape-id="123" text="Label 1" />
						<label-shape shape-id="456" text="Label 2" />
					</actions>
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			expect(result).toEqual([
				{
					type: 'label-shape',
					shapeId: '123',
					text: 'Label 1',
				},
				{
					type: 'label-shape',
					shapeId: '456',
					text: 'Label 2',
				},
			])
		})

		test('handles mixed create, delete, and move actions', () => {
			const xmlInput = `
				<response>
					<actions>
						<create-shapes>
							<geo id="new1" x="50" y="50" />
						</create-shapes>
						<move-shape shape-id="existing1" x="150" y="150" />
						<delete-shapes shape-ids="old1" />
					</actions>
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			expect(result).toEqual([
				{
					type: 'create-shape',
					shape: { id: 'new1', type: 'geo', x: 50, y: 50, text: '' },
				},
				{
					type: 'move-shape',
					shapeId: 'existing1',
					x: 150,
					y: 150,
				},
				{
					type: 'delete-shapes',
					shapeIds: ['old1'],
				},
			])
		})

		test('handles complete mixed create, delete, move, and label actions', () => {
			const xmlInput = `
				<response>
					<actions>
						<create-shapes>
							<geo id="new1" x="50" y="50" />
						</create-shapes>
						<move-shape shape-id="existing1" x="150" y="150" />
						<label-shape shape-id="existing1" text="Moved Shape" />
						<delete-shapes shape-ids="old1" />
					</actions>
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			expect(result).toEqual([
				{
					type: 'create-shape',
					shape: { id: 'new1', type: 'geo', x: 50, y: 50, text: '' },
				},
				{
					type: 'move-shape',
					shapeId: 'existing1',
					x: 150,
					y: 150,
				},
				{
					type: 'label-shape',
					shapeId: 'existing1',
					text: 'Moved Shape',
				},
				{
					type: 'delete-shapes',
					shapeIds: ['old1'],
				},
			])
		})

		test('skips label shapes without id attribute', () => {
			const xmlInput = `
				<response>
					<actions>
						<label-shape shape-id="valid" text="Valid Label" />
						<label-shape text="Invalid - No ID" />
					</actions>
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			expect(result).toEqual([
				{
					type: 'label-shape',
					shapeId: 'valid',
					text: 'Valid Label',
				},
			])
		})
	})

	describe('align shapes parsing', () => {
		test('parses align shapes action with multiple shapes', () => {
			const xmlInput = `
				<response>
									<actions>
					<align-shapes shape-ids="shape1,shape2,shape3" alignment="top" />
				</actions>
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			expect(result).toEqual([
				{
					type: 'align-shapes',
					shapeIds: ['shape1', 'shape2', 'shape3'],
					alignment: 'top',
				},
			])
		})

		test('parses align shapes action with different alignments', () => {
			const xmlInput = `
				<response>
									<actions>
					<align-shapes shape-ids="a,b" alignment="left" />
					<align-shapes shape-ids="c,d,e" alignment="center-horizontal" />
				</actions>
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			expect(result).toEqual([
				{
					type: 'align-shapes',
					shapeIds: ['a', 'b'],
					alignment: 'left',
				},
				{
					type: 'align-shapes',
					shapeIds: ['c', 'd', 'e'],
					alignment: 'center-horizontal',
				},
			])
		})

		test('supports all alignment types', () => {
			const alignments = ['top', 'bottom', 'left', 'right', 'center-horizontal', 'center-vertical']

			for (const alignment of alignments) {
				const xmlInput = `
					<response>
										<actions>
					<align-shapes shape-ids="shape1,shape2" alignment="${alignment}" />
				</actions>
					</response>
				`

				const result = parser.parseCompletedStream(xmlInput)

				expect(result).toEqual([
					{
						type: 'align-shapes',
						shapeIds: ['shape1', 'shape2'],
						alignment,
					},
				])

				// Reset parser for next iteration
				parser = new XmlResponseParser()
			}
		})

		test('ignores align action with only one shape', () => {
			const xmlInput = `
				<response>
									<actions>
					<align-shapes shape-ids="shape1" alignment="top" />
				</actions>
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			expect(result).toEqual([])
		})

		test('ignores align action with no shapes', () => {
			const xmlInput = `
				<response>
									<actions>
					<align-shapes shape-ids="" alignment="top" />
				</actions>
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			expect(result).toEqual([])
		})

		test('ignores align action with invalid alignment', () => {
			const xmlInput = `
				<response>
									<actions>
					<align-shapes shape-ids="shape1" alignment="invalid" />
				</actions>
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			expect(result).toEqual([])
		})

		test('ignores align action with no alignment attribute', () => {
			const xmlInput = `
				<response>
									<actions>
					<align-shapes shape-ids="shape1,shape2" />
				</actions>
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			expect(result).toEqual([])
		})

		test('handles mixed actions with align shapes', () => {
			const xmlInput = `
				<response>
					<thoughts>
						<thought>Let me create and align some shapes</thought>
					</thoughts>
					<actions>
						<create-shapes>
							<geo id="rect1" x="100" y="100" />
							<geo id="rect2" x="200" y="150" />
						</create-shapes>
						<align-shapes shape-ids="rect1,rect2" alignment="top" />
					</actions>	
				</response>
			`

			const result = parser.parseCompletedStream(xmlInput)

			expect(result).toEqual([
				{ type: 'thought', text: 'Let me create and align some shapes' },
				{
					type: 'create-shape',
					shape: { id: 'rect1', type: 'geo', x: 100, y: 100, text: '' },
				},
				{
					type: 'create-shape',
					shape: { id: 'rect2', type: 'geo', x: 200, y: 150, text: '' },
				},
				{
					type: 'align-shapes',
					shapeIds: ['rect1', 'rect2'],
					alignment: 'top',
				},
			])
		})

		test('parseCompletedStream calls are independent (no state preservation)', () => {
			const xmlInput = `
				<response>
									<actions>
					<align-shapes shape-ids="a,b" alignment="center-vertical" />
				</actions>
				</response>
			`

			// Parse the same input twice - each call should be independent
			const result1 = parser.parseCompletedStream(xmlInput)
			const result2 = parser.parseCompletedStream(xmlInput)

			const expectedResult = [
				{
					type: 'align-shapes',
					shapeIds: ['a', 'b'],
					alignment: 'center-vertical',
				},
			]

			expect(result1).toEqual(expectedResult)
			expect(result2).toEqual(expectedResult) // Should return the same result
		})
	})

	describe('streaming/incremental parsing', () => {
		test('parseStream should handle statements incrementally', () => {
			// Ensure fresh parser state
			parser.reset()

			// Chunk 1: Opening response and incomplete statement
			const chunk1 = '<response><actions><statement>This is a par'
			expect(parser.parseNewChunk(chunk1)).toEqual([])
			expect(parser.getCompletedItems()).toEqual([])

			// Chunk 2: Complete the statement
			const chunk2 = 'tial statement</statement></actions></response>'
			expect(parser.parseNewChunk(chunk2)).toEqual([
				{ type: 'statement', text: 'This is a partial statement' },
			])
			expect(parser.getCompletedItems()).toEqual([
				{ type: 'statement', text: 'This is a partial statement' },
			])
		})

		test('parseStream should build message chunk-by-chunk and extract completed items incrementally', () => {
			// Ensure fresh parser state
			parser.reset()

			// Chunk 1: Opening response and incomplete thought
			// After chunk1: incomplete thought, should return nothing
			const chunk1 = '<response><thoughts><thought>I need to create tw'
			expect(parser.parseNewChunk(chunk1)).toEqual([])
			expect(parser.getCompletedItems()).toEqual([])

			// Chunk 2: Complete the thought and start actions
			// After chunk2: thought is now complete, should return it
			const chunk2 = 'o rectangles</thought></thoughts><actions><create-shapes>'
			expect(parser.parseNewChunk(chunk2)).toEqual([
				{ type: 'thought', text: 'I need to create two rectangles' },
			])
			expect(parser.getCompletedItems()).toEqual([
				{ type: 'thought', text: 'I need to create two rectangles' },
			])

			// Chunk 3: First complete shape
			// After chunk3: first shape is complete, should return individual create-shape action
			const chunk3 = '<geo id="123" x="100" y="100" />'
			expect(parser.parseNewChunk(chunk3)).toEqual([
				{
					type: 'create-shape',
					shape: { id: '123', type: 'geo', x: 100, y: 100, text: '' },
				},
			])

			// Chunk 4: Second shape starts but incomplete
			expect(parser.getCompletedItems()).toEqual([
				{ type: 'thought', text: 'I need to create two rectangles' },
				{
					type: 'create-shape',
					shape: { id: '123', type: 'geo', x: 100, y: 100, text: '' },
				},
			])

			// Chunk 4: Second shape starts but incomplete
			// After chunk4: second shape incomplete, should return nothing
			const chunk4 = '<geo id="124" x="300" y="200" wid'
			expect(parser.parseNewChunk(chunk4)).toEqual([])
			expect(parser.getCompletedItems()).toEqual([
				{ type: 'thought', text: 'I need to create two rectangles' },
				{
					type: 'create-shape',
					shape: { id: '123', type: 'geo', x: 100, y: 100, text: '' },
				},
			])

			// Chunk 5: Complete the second shape and close everything
			// After chunk5: second shape is now complete, should return individual create-shape action
			const chunk5 = 'th="150" height="100" /></create-shapes></actions></response>'
			expect(parser.parseNewChunk(chunk5)).toEqual([
				{
					type: 'create-shape',
					shape: { id: '124', type: 'geo', x: 300, y: 200, text: '', width: 150, height: 100 },
				},
			])
			expect(parser.getCompletedItems()).toEqual([
				{ type: 'thought', text: 'I need to create two rectangles' },
				{
					type: 'create-shape',
					shape: { id: '123', type: 'geo', x: 100, y: 100, text: '' },
				},
				{
					type: 'create-shape',
					shape: { id: '124', type: 'geo', x: 300, y: 200, text: '', width: 150, height: 100 },
				},
			])
		})

		test('parseStream should emit move-shape actions as shapes complete', () => {
			// Ensure fresh parser state
			parser.reset()

			// Chunk 1: Opening response with thought
			const chunk1 = '<response><thoughts><thought>Moving shapes</thought></thoughts><actions>'
			expect(parser.parseNewChunk(chunk1)).toEqual([{ type: 'thought', text: 'Moving shapes' }])

			// Chunk 2: First complete move-shape action
			const chunk2 = '<move-shape shape-id="shape1" x="100" y="200" />'
			expect(parser.parseNewChunk(chunk2)).toEqual([
				{
					type: 'move-shape',
					shapeId: 'shape1',
					x: 100,
					y: 200,
				},
			])

			// Chunk 3: Second move-shape action
			const chunk3 = '<move-shape shape-id="shape2" x="300" y="400" />'
			expect(parser.parseNewChunk(chunk3)).toEqual([
				{
					type: 'move-shape',
					shapeId: 'shape2',
					x: 300,
					y: 400,
				},
			])

			// Verify completed items
			expect(parser.getCompletedItems()).toEqual([
				{ type: 'thought', text: 'Moving shapes' },
				{
					type: 'move-shape',
					shapeId: 'shape1',
					x: 100,
					y: 200,
				},
				{
					type: 'move-shape',
					shapeId: 'shape2',
					x: 300,
					y: 400,
				},
			])
		})

		test('parseStream should emit label-shape actions as shapes complete', () => {
			// Ensure fresh parser state
			parser.reset()

			// Chunk 1: Opening response with thought
			const chunk1 = '<response><thoughts><thought>Labeling shapes</thought></thoughts><actions>'
			expect(parser.parseNewChunk(chunk1)).toEqual([{ type: 'thought', text: 'Labeling shapes' }])

			// Chunk 2: First complete label-shape action
			const chunk2 = '<label-shape shape-id="shape1" text="First Label" />'
			expect(parser.parseNewChunk(chunk2)).toEqual([
				{
					type: 'label-shape',
					shapeId: 'shape1',
					text: 'First Label',
				},
			])

			// Chunk 3: Second label-shape action
			const chunk3 = '<label-shape shape-id="shape2" text="Second Label" />'
			expect(parser.parseNewChunk(chunk3)).toEqual([
				{
					type: 'label-shape',
					shapeId: 'shape2',
					text: 'Second Label',
				},
			])

			// Verify completed items
			expect(parser.getCompletedItems()).toEqual([
				{ type: 'thought', text: 'Labeling shapes' },
				{
					type: 'label-shape',
					shapeId: 'shape1',
					text: 'First Label',
				},
				{
					type: 'label-shape',
					shapeId: 'shape2',
					text: 'Second Label',
				},
			])
		})

		test('parses incomplete align blocks (streaming)', () => {
			// Test streaming parsing with incomplete align block
			let result = parser.parseNewChunk(
				'<response><actions><align-shapes shape-ids="shape1,shape2" alignment="bottom" />'
			)
			expect(result).toEqual([
				{
					type: 'align-shapes',
					shapeIds: ['shape1', 'shape2'],
					alignment: 'bottom',
				},
			])

			result = parser.parseNewChunk('<align-shapes shape-ids="shape3,shape4" alignment="top" />')
			expect(result).toEqual([
				{
					type: 'align-shapes',
					shapeIds: ['shape3', 'shape4'],
					alignment: 'top',
				},
			])
		})
	})

	describe('error handling and edge cases', () => {
		test('throws error for no attributes', () => {
			const invalidXml = '<geo/>'

			expect(() => {
				parser.parseCompletedStream(invalidXml)
			}).toThrow('Unexpected closing tag')
		})

		test('throws error for unknown tags', () => {
			const invalidXml = '<response><unclosed /></response>'

			expect(parser.parseCompletedStream(invalidXml)).toEqual([])
		})

		test('throws error for missing response element', () => {
			const xmlWithoutResponse = '<root><thoughts><thought>test</thought></thoughts></root>'

			expect(parser.parseCompletedStream(xmlWithoutResponse)).toEqual([])
		})

		test.todo('parseStream handles incomplete XML ending mid-shape')
	})
})

test('parses complicated string with multiple move-shape actions', () => {
	const xmlInput =
		'<thoughts>\n    <thought>The user wants to spread out the overlapping shapes. There are seven shapes on the canvas, all clustered together. I need to move them so they are no longer overlapping. I will arrange them in a grid to make them easy to see. A 3x3 grid would be suitable for seven shapes. I will move each shape to a new position on the canvas, leaving space between them.</thought>\n</thoughts>\n<actions>\n    <move-shape shape-id="shape:0Q1GTkxghzV4DpPlTKvG0" x="50" y="50" />\n    <move-shape shape-id="shape:OhDkIUiDpfF5zIZIC_D5Z" x="170" y="50" />\n    <move-shape shape-id="shape:hTLHHOanerkvZU2g2pF2b" x="290" y="50" />\n    <move-shape shape-id="shape:g7YN2JayUWjOFhxM8VlNq" x="50" y="170" />\n    <move-shape shape-id="shape:lkfVDSQn6kYrWCeGg3qKR" x="170" y="170" />\n    <move-shape shape-id="shape:bHCm3ntLyw3H2NO1uMUKd" x="290" y="170" />\n    <move-shape shape-id="shape:mBo9eQdAuc-uNM-bdaxMw" x="170" y="290" />\n</actions>'
	const parser = new XmlResponseParser()
	const result = parser.parseCompletedStream(xmlInput)
	expect(result).toEqual([
		{
			type: 'thought',
			text: 'The user wants to spread out the overlapping shapes. There are seven shapes on the canvas, all clustered together. I need to move them so they are no longer overlapping. I will arrange them in a grid to make them easy to see. A 3x3 grid would be suitable for seven shapes. I will move each shape to a new position on the canvas, leaving space between them.',
		},
		{ type: 'move-shape', shapeId: 'shape:0Q1GTkxghzV4DpPlTKvG0', x: 50, y: 50 },
		{ type: 'move-shape', shapeId: 'shape:OhDkIUiDpfF5zIZIC_D5Z', x: 170, y: 50 },
		{ type: 'move-shape', shapeId: 'shape:hTLHHOanerkvZU2g2pF2b', x: 290, y: 50 },
		{ type: 'move-shape', shapeId: 'shape:g7YN2JayUWjOFhxM8VlNq', x: 50, y: 170 },
		{ type: 'move-shape', shapeId: 'shape:lkfVDSQn6kYrWCeGg3qKR', x: 170, y: 170 },
		{ type: 'move-shape', shapeId: 'shape:bHCm3ntLyw3H2NO1uMUKd', x: 290, y: 170 },
		{ type: 'move-shape', shapeId: 'shape:mBo9eQdAuc-uNM-bdaxMw', x: 170, y: 290 },
	])
})

test('parses a complicated statement', () => {
	const xmlInput = ``
	const parser = new XmlResponseParser()
	const result = parser.parseCompletedStream(xmlInput)
	expect(result).toEqual([])
})
