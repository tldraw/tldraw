import { Editor, createTLStore } from '@tldraw/editor'
import { TLUiEventHandler } from '../../ui/context/events'
import {
	OCIF_FILE_EXTENSION,
	OCIF_FILE_MIMETYPE,
	type OcifFile,
	parseOcifFile,
	serializeTldrawToOcif,
	serializeTldrawToOcifBlob,
} from './ocif'

// Mock TLUiEventHandler for testing
const mockEventHandler: TLUiEventHandler = () => {}

describe('OCIF', () => {
	let editor: Editor

	beforeEach(() => {
		editor = new Editor({
			store: createTLStore({ shapeUtils: [], bindingUtils: [] }),
			user: {
				userPreferences: {},
			} as any,
			getContainer: () => document.body,
			initialState: 'select',
		})
	})

	describe('Constants', () => {
		it('should have correct MIME type', () => {
			expect(OCIF_FILE_MIMETYPE).toBe('application/vnd.ocif+json')
		})

		it('should have correct file extension', () => {
			expect(OCIF_FILE_EXTENSION).toBe('.ocif')
		})
	})

	describe('Basic shapes export/import', () => {
		it('should export and import a rectangle', async () => {
			// Create a rectangle
			editor.createShape({
				id: 'shape:test-rect',
				type: 'geo',
				x: 100,
				y: 100,
				props: {
					geo: 'rectangle',
					w: 200,
					h: 150,
					color: 'blue',
					fill: 'solid',
					size: 'm',
				},
			})

			// Export to OCIF
			const ocifJson = await serializeTldrawToOcif(editor)
			const ocifData: OcifFile = JSON.parse(ocifJson)

			// Verify OCIF structure
			expect(ocifData.ocif).toBe('https://canvasprotocol.org/ocif/v0.5')
			expect(ocifData.nodes).toHaveLength(1)
			expect(ocifData.nodes[0]).toMatchObject({
				id: 'shape:test-rect',
				position: [100, 100],
				size: [200, 150],
				data: [
					{
						type: '@ocif/node/rect',
						strokeColor: '#0066CC',
						fillColor: '#0066CC',
						strokeWidth: 4,
					},
				],
			})

			// Import back to tldraw
			const parseResult = parseOcifFile({
				json: ocifJson,
				schema: editor.store.schema,
			})

			expect(parseResult.ok).toBe(true)
			if (parseResult.ok) {
				const shapes = Array.from(parseResult.value.allRecords()).filter(
					(r) => r.typeName === 'shape'
				)
				expect(shapes).toHaveLength(1)
				const shape = shapes[0] as any
				expect(shape.type).toBe('geo')
				expect(shape.props.geo).toBe('rectangle')
				expect(shape.props.color).toBe('blue')
				expect(shape.props.fill).toBe('solid')
			}
		})

		it('should export and import an ellipse', async () => {
			// Create an ellipse
			editor.createShape({
				id: 'shape:test-ellipse',
				type: 'geo',
				x: 50,
				y: 75,
				props: {
					geo: 'ellipse',
					w: 100,
					h: 80,
					color: 'red',
					fill: 'none',
					size: 's',
				},
			})

			// Export to OCIF
			const ocifJson = await serializeTldrawToOcif(editor)
			const ocifData: OcifFile = JSON.parse(ocifJson)

			// Verify OCIF structure
			expect(ocifData.nodes).toHaveLength(1)
			expect(ocifData.nodes[0]).toMatchObject({
				id: 'shape:test-ellipse',
				position: [50, 75],
				size: [100, 80],
				data: [
					{
						type: '@ocif/node/oval',
						strokeColor: '#FF0000',
						fillColor: 'transparent',
						strokeWidth: 2,
					},
				],
			})

			// Import back to tldraw
			const parseResult = parseOcifFile({
				json: ocifJson,
				schema: editor.store.schema,
			})

			expect(parseResult.ok).toBe(true)
			if (parseResult.ok) {
				const shapes = Array.from(parseResult.value.allRecords()).filter(
					(r) => r.typeName === 'shape'
				)
				expect(shapes).toHaveLength(1)
				const shape = shapes[0] as any
				expect(shape.type).toBe('geo')
				expect(shape.props.geo).toBe('ellipse')
				expect(shape.props.color).toBe('red')
				expect(shape.props.fill).toBe('none')
			}
		})

		it('should export and import an arrow', async () => {
			// Create an arrow
			editor.createShape({
				id: 'shape:test-arrow',
				type: 'arrow',
				x: 0,
				y: 0,
				props: {
					start: { x: 10, y: 10 },
					end: { x: 100, y: 50 },
					color: 'green',
					size: 'l',
					arrowheadStart: 'none',
					arrowheadEnd: 'arrow',
				},
			})

			// Export to OCIF
			const ocifJson = await serializeTldrawToOcif(editor)
			const ocifData: OcifFile = JSON.parse(ocifJson)

			// Verify OCIF structure
			expect(ocifData.nodes).toHaveLength(1)
			expect(ocifData.nodes[0]).toMatchObject({
				id: 'shape:test-arrow',
				data: [
					{
						type: '@ocif/node/arrow',
						strokeColor: '#00AA00',
						start: [10, 10],
						end: [100, 50],
						startMarker: 'none',
						endMarker: 'arrowhead',
						strokeWidth: 8,
					},
				],
			})

			// Import back to tldraw
			const parseResult = parseOcifFile({
				json: ocifJson,
				schema: editor.store.schema,
			})

			expect(parseResult.ok).toBe(true)
			if (parseResult.ok) {
				const shapes = Array.from(parseResult.value.allRecords()).filter(
					(r) => r.typeName === 'shape'
				)
				expect(shapes).toHaveLength(1)
				const shape = shapes[0] as any
				expect(shape.type).toBe('arrow')
				expect(shape.props.color).toBe('green')
				expect(shape.props.arrowheadStart).toBe('none')
				expect(shape.props.arrowheadEnd).toBe('arrow')
			}
		})
	})

	describe('Complex scenarios', () => {
		it('should handle multiple shapes', async () => {
			// Create multiple shapes
			editor.createShapes([
				{
					id: 'shape:rect1',
					type: 'geo',
					x: 0,
					y: 0,
					props: { geo: 'rectangle', w: 100, h: 100, color: 'blue' },
				},
				{
					id: 'shape:ellipse1',
					type: 'geo',
					x: 150,
					y: 0,
					props: { geo: 'ellipse', w: 100, h: 100, color: 'red' },
				},
				{
					id: 'shape:arrow1',
					type: 'arrow',
					x: 0,
					y: 0,
					props: {
						start: { x: 50, y: 50 },
						end: { x: 200, y: 50 },
						color: 'green',
					},
				},
			])

			// Export to OCIF
			const ocifJson = await serializeTldrawToOcif(editor)
			const ocifData: OcifFile = JSON.parse(ocifJson)

			// Verify OCIF structure
			expect(ocifData.nodes).toHaveLength(3)

			// Import back to tldraw
			const parseResult = parseOcifFile({
				json: ocifJson,
				schema: editor.store.schema,
			})

			expect(parseResult.ok).toBe(true)
			if (parseResult.ok) {
				const shapes = Array.from(parseResult.value.allRecords()).filter(
					(r) => r.typeName === 'shape'
				)
				expect(shapes).toHaveLength(3)
			}
		})

		it('should handle empty canvas', async () => {
			// Export empty canvas
			const ocifJson = await serializeTldrawToOcif(editor)
			const ocifData: OcifFile = JSON.parse(ocifJson)

			// Verify OCIF structure
			expect(ocifData.nodes).toHaveLength(0)
			expect(ocifData.relations).toBeUndefined()
			expect(ocifData.resources).toBeUndefined()

			// Import back to tldraw
			const parseResult = parseOcifFile({
				json: ocifJson,
				schema: editor.store.schema,
			})

			expect(parseResult.ok).toBe(true)
		})
	})

	describe('Color conversion', () => {
		it('should convert tldraw colors to hex and back', async () => {
			const colorTests = [
				{ tldraw: 'black', hex: '#000000' },
				{ tldraw: 'blue', hex: '#0066CC' },
				{ tldraw: 'green', hex: '#00AA00' },
				{ tldraw: 'red', hex: '#FF0000' },
				{ tldraw: 'yellow', hex: '#FFDD00' },
			]

			for (const { tldraw, hex } of colorTests) {
				editor.createShape({
					id: `shape:${tldraw}`,
					type: 'geo',
					x: 0,
					y: 0,
					props: { geo: 'rectangle', w: 100, h: 100, color: tldraw, fill: 'solid' },
				})

				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				expect(ocifData.nodes[0].data[0].strokeColor).toBe(hex)
				expect(ocifData.nodes[0].data[0].fillColor).toBe(hex)

				// Clean up for next iteration
				editor.deleteShape(`shape:${tldraw}`)
			}
		})

		it('should handle transparent fills', async () => {
			editor.createShape({
				id: 'shape:transparent',
				type: 'geo',
				x: 0,
				y: 0,
				props: { geo: 'rectangle', w: 100, h: 100, color: 'blue', fill: 'none' },
			})

			const ocifJson = await serializeTldrawToOcif(editor)
			const ocifData: OcifFile = JSON.parse(ocifJson)

			expect(ocifData.nodes[0].data[0].fillColor).toBe('transparent')
		})
	})

	describe('Blob serialization', () => {
		it('should create a proper OCIF blob', async () => {
			editor.createShape({
				id: 'shape:test',
				type: 'geo',
				x: 0,
				y: 0,
				props: { geo: 'rectangle', w: 100, h: 100 },
			})

			const blob = await serializeTldrawToOcifBlob(editor)

			expect(blob.type).toBe(OCIF_FILE_MIMETYPE)
			expect(blob.size).toBeGreaterThan(0)

			// Verify blob content
			const text = await blob.text()
			const ocifData: OcifFile = JSON.parse(text)
			expect(ocifData.ocif).toBe('https://canvasprotocol.org/ocif/v0.5')
		})
	})

	describe('Error handling', () => {
		it('should handle invalid JSON', () => {
			const parseResult = parseOcifFile({
				json: 'invalid json',
				schema: editor.store.schema,
			})

			expect(parseResult.ok).toBe(false)
			if (!parseResult.ok) {
				expect(parseResult.error.type).toBe('notAnOcifFile')
			}
		})

		it('should handle missing OCIF version', () => {
			const invalidOcif = JSON.stringify({
				nodes: [],
			})

			const parseResult = parseOcifFile({
				json: invalidOcif,
				schema: editor.store.schema,
			})

			expect(parseResult.ok).toBe(false)
			if (!parseResult.ok) {
				expect(parseResult.error.type).toBe('notAnOcifFile')
			}
		})

		it('should handle unsupported OCIF version', () => {
			const unsupportedOcif = JSON.stringify({
				ocif: 'https://canvasprotocol.org/ocif/v1.0',
				nodes: [],
			})

			const parseResult = parseOcifFile({
				json: unsupportedOcif,
				schema: editor.store.schema,
			})

			expect(parseResult.ok).toBe(false)
			if (!parseResult.ok) {
				expect(parseResult.error.type).toBe('ocifVersionNotSupported')
			}
		})

		it('should handle unknown shape types gracefully', async () => {
			const unknownShapeOcif = JSON.stringify({
				ocif: 'https://canvasprotocol.org/ocif/v0.5',
				nodes: [
					{
						id: 'shape:unknown',
						position: [0, 0],
						size: [100, 100],
						data: [
							{
								type: '@unknown/node/type',
								someProperty: 'value',
							},
						],
					},
				],
			})

			const parseResult = parseOcifFile({
				json: unknownShapeOcif,
				schema: editor.store.schema,
			})

			expect(parseResult.ok).toBe(true)
			if (parseResult.ok) {
				const shapes = Array.from(parseResult.value.allRecords()).filter(
					(r) => r.typeName === 'shape'
				)
				expect(shapes).toHaveLength(1)
				// Should fallback to a geo rectangle
				const shape = shapes[0] as any
				expect(shape.type).toBe('geo')
				expect(shape.props.geo).toBe('rectangle')
			}
		})
	})

	describe('Schema validation', () => {
		it('should include required schemas in export', async () => {
			editor.createShape({
				id: 'shape:test',
				type: 'geo',
				x: 0,
				y: 0,
				props: { geo: 'rectangle', w: 100, h: 100 },
			})

			const ocifJson = await serializeTldrawToOcif(editor)
			const ocifData: OcifFile = JSON.parse(ocifJson)

			expect(ocifData.schemas).toBeDefined()
			expect(ocifData.schemas).toContainEqual({
				name: '@ocif/node/rect',
				uri: 'https://spec.canvasprotocol.org/v0.5/core/rect-node.json',
			})
			expect(ocifData.schemas).toContainEqual({
				name: '@ocif/node/oval',
				uri: 'https://spec.canvasprotocol.org/v0.5/core/oval-node.json',
			})
			expect(ocifData.schemas).toContainEqual({
				name: '@ocif/node/arrow',
				uri: 'https://spec.canvasprotocol.org/v0.5/core/arrow-node.json',
			})
			expect(ocifData.schemas).toContainEqual({
				name: '@ocif/rel/edge',
				uri: 'https://spec.canvasprotocol.org/v0.5/core/edge-rel.json',
			})
		})
	})

	describe('Round-trip consistency', () => {
		it('should maintain shape integrity through export/import cycle', async () => {
			const originalShapes = [
				{
					id: 'shape:rect',
					type: 'geo' as const,
					x: 10,
					y: 20,
					props: { geo: 'rectangle' as const, w: 100, h: 80, color: 'blue' as const },
				},
				{
					id: 'shape:circle',
					type: 'geo' as const,
					x: 150,
					y: 20,
					props: { geo: 'ellipse' as const, w: 90, h: 90, color: 'red' as const },
				},
			]

			// Create original shapes
			editor.createShapes(originalShapes)

			// Export to OCIF
			const ocifJson = await serializeTldrawToOcif(editor)

			// Import back
			const parseResult = parseOcifFile({
				json: ocifJson,
				schema: editor.store.schema,
			})

			expect(parseResult.ok).toBe(true)
			if (parseResult.ok) {
				const importedShapes = Array.from(parseResult.value.allRecords()).filter(
					(r) => r.typeName === 'shape'
				)

				expect(importedShapes).toHaveLength(originalShapes.length)

				// Check that key properties are preserved
				const rectShape = importedShapes.find((s: any) => s.props.geo === 'rectangle') as any
				const ellipseShape = importedShapes.find((s: any) => s.props.geo === 'ellipse') as any

				expect(rectShape).toBeDefined()
				expect(rectShape.x).toBe(10)
				expect(rectShape.y).toBe(20)
				expect(rectShape.props.w).toBe(100)
				expect(rectShape.props.h).toBe(80)

				expect(ellipseShape).toBeDefined()
				expect(ellipseShape.x).toBe(150)
				expect(ellipseShape.y).toBe(20)
				expect(ellipseShape.props.w).toBe(90)
				expect(ellipseShape.props.h).toBe(90)
			}
		})
	})
}) 