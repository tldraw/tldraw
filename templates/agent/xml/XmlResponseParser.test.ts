import { XmlResponseParser } from './XmlResponseParser'
import { IResponse } from './xml-parsed-types'

describe('XmlResponseParser', () => {
	let parser: XmlResponseParser

	beforeEach(() => {
		parser = new XmlResponseParser()
	})

	test('parses complete XML response with thoughts and actions', () => {
		const xmlInput = `
			<response>
				<thoughts>
					<thought>I need to create a rectangle</thought>
				</thoughts>
				<actions>
					<create-shapes>
						<shape id="123" type="geo" x="100" y="100" />
						<shape id="124" type="geo" x="300" y="200" />
					</create-shapes>
				</actions>
				<thoughts>
					<thought>I need to create some text</thought>
				</thoughts>
				<actions>
					<create-shapes>
						<shape id="456" type="text" x="200" y="200" text="Hello, world!" />
					</create-shapes>
				</actions>
				<thoughts>
					<thought>I need to delete the rectangle</thought>
				</thoughts>
				<actions>
					<delete-shapes>
						<shape id="123" />
					</delete-shapes>
				</actions>
			</response>
		`

		const result = parser.parseCompletedStream(xmlInput)

		const expected: IResponse = [
			{ type: 'thought', text: 'I need to create a rectangle' },
			{
				type: 'create-shape',
				shape: { id: '123', type: 'geo', x: 100, y: 100 },
			},
			{
				type: 'create-shape',
				shape: { id: '124', type: 'geo', x: 300, y: 200 },
			},
			{ type: 'thought', text: 'I need to create some text' },
			{
				type: 'create-shape',
				shape: { id: '456', type: 'text', x: 200, y: 200, text: 'Hello, world!' },
			},
			{ type: 'thought', text: 'I need to delete the rectangle' },
			{
				type: 'delete-shape',
				shapeId: '123',
			},
		]

		expect(result).toEqual(expected)
	})

	test('handles multiple shapes in single action', () => {
		const xmlInput = `
			<response>
				<actions>
					<create-shapes>
						<shape id="1" type="geo" x="0" y="0" />
						<shape id="2" type="text" x="50" y="50" text="Test" />
					</create-shapes>
				</actions>
			</response>
		`

		const result = parser.parseCompletedStream(xmlInput)

		expect(result).toEqual([
			{
				type: 'create-shape',
				shape: { id: '1', type: 'geo', x: 0, y: 0 },
			},
			{
				type: 'create-shape',
				shape: { id: '2', type: 'text', x: 50, y: 50, text: 'Test' },
			},
		])
	})

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

	test('throws error for invalid XML', () => {
		const invalidXml = '<response><unclosed'

		expect(() => {
			parser.parseCompletedStream(invalidXml)
		}).toThrow('XML parsing error')
	})

	test('throws error for missing response element', () => {
		const xmlWithoutResponse = '<root><thoughts><thought>test</thought></thoughts></root>'

		expect(() => {
			parser.parseCompletedStream(xmlWithoutResponse)
		}).toThrow('Invalid XML response')
	})

	test('skips invalid shapes without required attributes', () => {
		const xmlInput = `
			<response>
				<actions>
					<create-shapes>
						<shape id="valid" type="geo" x="100" y="100" />
						<shape type="geo" x="100" y="100" />
						<shape id="invalid" x="100" y="100" />
					</create-shapes>
				</actions>
			</response>
		`

		const result = parser.parseCompletedStream(xmlInput)

		expect(result).toEqual([
			{
				type: 'create-shape',
				shape: { id: 'valid', type: 'geo', x: 100, y: 100 },
			},
		])
	})

	test('handles empty response', () => {
		const xmlInput = '<response></response>'

		const result = parser.parseCompletedStream(xmlInput)

		expect(result).toEqual([])
	})

	test('parseStream handles incomplete XML ending mid-shape', () => {
		// Ensure fresh parser state
		parser.reset()

		// XML that cuts off halfway through the second shape AND has incomplete thought
		const incompleteXmlBigChunk = `<response><thoughts><thought>I need to create two rectangles but this thought is incomplete</thoughts><actions><create-shapes><shape id="123" type="geo" x="100" y="100" /><shape id="124" type="geo" x="300" y="200" wid`

		// Streaming implementation gracefully handles incomplete XML
		const result = parser.parseStream(incompleteXmlBigChunk)

		// Returns the completed shape even though the thought is incomplete (missing </thought>)
		// and the create action is incomplete (missing </create>)
		// This is the new behavior: individual shapes are returned as soon as they're complete
		expect(result).toEqual([
			{
				type: 'create-shape',
				shape: { id: '123', type: 'geo', x: 100, y: 100 },
			},
		])
	})

	test('parseStream should build message chunk-by-chunk and extract completed items incrementally', () => {
		// Ensure fresh parser state
		parser.reset()

		// Chunk 1: Opening response and incomplete thought
		// After chunk1: incomplete thought, should return nothing
		const chunk1 = '<response><thoughts><thought>I need to create tw'
		expect(parser.parseStream(chunk1)).toEqual([])
		expect(parser.getCompletedItems()).toEqual([])

		// Chunk 2: Complete the thought and start actions
		// After chunk2: thought is now complete, should return it
		const chunk2 = 'o rectangles</thought></thoughts><actions><create-shapes>'
		expect(parser.parseStream(chunk2)).toEqual([
			{ type: 'thought', text: 'I need to create two rectangles' },
		])
		expect(parser.getCompletedItems()).toEqual([
			{ type: 'thought', text: 'I need to create two rectangles' },
		])

		// Chunk 3: First complete shape
		// After chunk3: first shape is complete, should return individual create-shape action
		const chunk3 = '<shape id="123" type="geo" x="100" y="100" />'
		expect(parser.parseStream(chunk3)).toEqual([
			{
				type: 'create-shape',
				shape: { id: '123', type: 'geo', x: 100, y: 100 },
			},
		])
		expect(parser.getCompletedItems()).toEqual([
			{ type: 'thought', text: 'I need to create two rectangles' },
			{
				type: 'create-shape',
				shape: { id: '123', type: 'geo', x: 100, y: 100 },
			},
		])

		// Chunk 4: Second shape starts but incomplete
		// After chunk4: second shape incomplete, should return nothing
		const chunk4 = '<shape id="124" type="geo" x="300" y="200" wid'
		expect(parser.parseStream(chunk4)).toEqual([])
		expect(parser.getCompletedItems()).toEqual([
			{ type: 'thought', text: 'I need to create two rectangles' },
			{
				type: 'create-shape',
				shape: { id: '123', type: 'geo', x: 100, y: 100 },
			},
		])

		// Chunk 5: Complete the second shape and close everything
		// After chunk5: second shape is now complete, should return individual create-shape action
		const chunk5 = 'th="150" height="100" /></create></actions></response>'
		expect(parser.parseStream(chunk5)).toEqual([
			{
				type: 'create-shape',
				shape: { id: '124', type: 'geo', x: 300, y: 200 },
			},
		])
		expect(parser.getCompletedItems()).toEqual([
			{ type: 'thought', text: 'I need to create two rectangles' },
			{
				type: 'create-shape',
				shape: { id: '123', type: 'geo', x: 100, y: 100 },
			},
			{
				type: 'create-shape',
				shape: { id: '124', type: 'geo', x: 300, y: 200 },
			},
		])
	})

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

	test('parseStream should emit move-shape actions as shapes complete', () => {
		// Ensure fresh parser state
		parser.reset()

		// Chunk 1: Opening response with thought
		const chunk1 = '<response><thoughts><thought>Moving shapes</thought></thoughts><actions>'
		expect(parser.parseStream(chunk1)).toEqual([{ type: 'thought', text: 'Moving shapes' }])

		// Chunk 2: First complete move-shape action
		const chunk2 = '<move-shape shape-id="shape1" x="100" y="200" />'
		expect(parser.parseStream(chunk2)).toEqual([
			{
				type: 'move-shape',
				shapeId: 'shape1',
				x: 100,
				y: 200,
			},
		])

		// Chunk 3: Second move-shape action
		const chunk3 = '<move-shape shape-id="shape2" x="300" y="400" />'
		expect(parser.parseStream(chunk3)).toEqual([
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

	test('handles mixed create, delete, and move actions', () => {
		const xmlInput = `
			<response>
				<actions>
					<create-shapes>
						<shape id="new1" type="geo" x="50" y="50" />
					</create-shapes>
					<move-shape shape-id="existing1" x="150" y="150" />
					<delete-shapes>
						<shape id="old1" />
					</delete-shapes>
				</actions>
			</response>
		`

		const result = parser.parseCompletedStream(xmlInput)

		expect(result).toEqual([
			{
				type: 'create-shape',
				shape: { id: 'new1', type: 'geo', x: 50, y: 50 },
			},
			{
				type: 'move-shape',
				shapeId: 'existing1',
				x: 150,
				y: 150,
			},
			{
				type: 'delete-shape',
				shapeId: 'old1',
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

	test('parseStream should emit label-shape actions as shapes complete', () => {
		// Ensure fresh parser state
		parser.reset()

		// Chunk 1: Opening response with thought
		const chunk1 = '<response><thoughts><thought>Labeling shapes</thought></thoughts><actions>'
		expect(parser.parseStream(chunk1)).toEqual([{ type: 'thought', text: 'Labeling shapes' }])

		// Chunk 2: First complete label-shape action
		const chunk2 = '<label-shape shape-id="shape1" text="First Label" />'
		expect(parser.parseStream(chunk2)).toEqual([
			{
				type: 'label-shape',
				shapeId: 'shape1',
				text: 'First Label',
			},
		])

		// Chunk 3: Second label-shape action
		const chunk3 = '<label-shape shape-id="shape2" text="Second Label" />'
		expect(parser.parseStream(chunk3)).toEqual([
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
					<label-shape shape-id="123" text="" />
					<label-shape shape-id="456" text="" />
				</actions>
			</response>
		`

		const result = parser.parseCompletedStream(xmlInput)

		expect(result).toEqual([
			{
				type: 'label-shape',
				shapeId: '123',
				text: '',
			},
			{
				type: 'label-shape',
				shapeId: '456',
				text: '',
			},
		])
	})

	test('handles complete mixed create, delete, move, and label actions', () => {
		const xmlInput = `
			<response>
				<actions>
					<create-shapes>
						<shape id="new1" type="geo" x="50" y="50" />
					</create-shapes>
					<move-shape shape-id="existing1" x="150" y="150" />
					<label-shape shape-id="existing1" text="Moved Shape" />
					<delete-shapes>
						<shape id="old1" />
					</delete-shapes>
				</actions>
			</response>
		`

		const result = parser.parseCompletedStream(xmlInput)

		expect(result).toEqual([
			{
				type: 'create-shape',
				shape: { id: 'new1', type: 'geo', x: 50, y: 50 },
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
				type: 'delete-shape',
				shapeId: 'old1',
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
					<align-shapes shape-ids="c,d,e" alignment="center-x" />
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
					alignment: 'center-x',
				},
			])
		})

		test('supports all alignment types', () => {
			const alignments = ['top', 'bottom', 'left', 'right', 'center-x', 'center-y']

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
					<align-shapes shape-ids="shape1,shape2" alignment="invalid" />
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

		test('parses incomplete align blocks (streaming)', () => {
			// Test streaming parsing with incomplete align block
			let result = parser.parseStream(
				'<response><actions><align-shapes shape-ids="shape1,shape2" alignment="bottom" />'
			)
			expect(result).toEqual([
				{
					type: 'align-shapes',
					shapeIds: ['shape1', 'shape2'],
					alignment: 'bottom',
				},
			])

			result = parser.parseStream('<align-shapes shape-ids="shape3,shape4" alignment="top" />')
			expect(result).toEqual([
				{
					type: 'align-shapes',
					shapeIds: ['shape3', 'shape4'],
					alignment: 'top',
				},
			])
		})

		test('handles mixed actions with align shapes', () => {
			const xmlInput = `
				<response>
					<thoughts>
						<thought>Let me create and align some shapes</thought>
					</thoughts>
									<actions>
					<create-shapes>
						<shape id="rect1" type="geo" x="100" y="100" />
						<shape id="rect2" type="geo" x="200" y="150" />
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
					shape: { id: 'rect1', type: 'geo', x: 100, y: 100 },
				},
				{
					type: 'create-shape',
					shape: { id: 'rect2', type: 'geo', x: 200, y: 150 },
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
					<align-shapes shape-ids="a,b" alignment="center-y" />
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
					alignment: 'center-y',
				},
			]

			expect(result1).toEqual(expectedResult)
			expect(result2).toEqual(expectedResult) // Should return the same result
		})
	})
})
