import { AssetRecordType, createShapeId, toRichText } from '@tldraw/editor'
import { TestEditor } from '../../../test/TestEditor'
import {
	OCIF_FILE_EXTENSION,
	OCIF_FILE_MIMETYPE,
	parseOcifFile,
	serializeTldrawToOcif,
	serializeTldrawToOcifBlob,
	type OcifFile,
} from './ocif'

describe('OCIF', () => {
	let editor: TestEditor

	beforeEach(() => {
		editor = new TestEditor()
	})

	describe('Constants', () => {
		it('should have correct MIME type', () => {
			expect(OCIF_FILE_MIMETYPE).toBe('application/vnd.ocif+json')
		})

		it('should have correct file extension', () => {
			expect(OCIF_FILE_EXTENSION).toBe('.ocif.json')
		})
	})

	describe('OCIF v0.5 specification compliance', () => {
		describe('Header (ocif property)', () => {
			it('should have correct OCIF version header', async () => {
				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				expect(ocifData.ocif).toBe('https://canvasprotocol.org/ocif/v0.5')
			})
		})

		describe('Nodes structure', () => {
			it('should include all required node properties', async () => {
				editor.createShape({
					id: createShapeId('test-node'),
					type: 'geo',
					x: 100,
					y: 200,
					rotation: Math.PI / 4,
					props: {
						geo: 'rectangle',
						w: 150,
						h: 100,
						color: 'blue',
						fill: 'solid',
					},
				})

				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				expect(ocifData.nodes).toHaveLength(1)
				const node = ocifData.nodes[0]

				// Required properties
				expect(node.id).toBeDefined()
				expect(node.position).toEqual([100, 200])
				expect(node.data).toBeDefined()
				expect(Array.isArray(node.data)).toBe(true)

				// Optional properties
				expect(node.size).toEqual([150, 100])

				// Check for missing properties from spec
				expect(node).toHaveProperty('rotation')
				expect(node.rotation).toBeCloseTo(Math.PI / 4)
			})

			it('should support resource reference in nodes', async () => {
				// Create an image shape that should reference a resource
				const assetId = AssetRecordType.createId('test-asset')
				editor.createShape({
					id: createShapeId('image-node'),
					type: 'image',
					x: 0,
					y: 0,
					props: {
						w: 100,
						h: 100,
						assetId: assetId,
						url: 'https://example.com/image.png',
					},
				})

				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				const imageNode = ocifData.nodes.find((n) => n.resource)
				expect(imageNode).toBeDefined()
				expect(imageNode?.resource).toBeDefined()
			})

			it('should support resourceFit property in nodes and create correct shapes', async () => {
				const testOcif = JSON.stringify({
					ocif: 'https://canvasprotocol.org/ocif/v0.5',
					nodes: [
						{
							id: 'node1',
							position: [10, 20],
							size: [100, 80],
							resource: 'resource1',
							resourceFit: 'contain',
							rotation: Math.PI / 6,
							data: [{ type: '@ocif/node/rect', strokeColor: '#FF0000' }],
						},
					],
					resources: [
						{
							id: 'resource1',
							representations: [
								{
									content: 'data:image/png;base64,iVBOR...',
									mimeType: 'image/png',
								},
							],
						},
					],
				})

				const parseResult = parseOcifFile({
					json: testOcif,
					schema: editor.store.schema,
				})

				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())

					// Check that shapes were created
					const shapes = records.filter((r) => r.typeName === 'shape')
					expect(shapes).toHaveLength(1)

					const shape = shapes[0] as any
					expect(shape.id).toBe('shape:node1')
					expect(shape.x).toBe(10)
					expect(shape.y).toBe(20)
					expect(shape.rotation).toBeCloseTo(Math.PI / 6)
					expect(shape.props.w).toBe(100)
					expect(shape.props.h).toBe(80)

					// Check that assets were created
					const assets = records.filter((r) => r.typeName === 'asset')
					expect(assets).toHaveLength(1)

					const asset = assets[0] as any
					expect(asset.props.src).toBe('data:image/png;base64,iVBOR...')
					expect(asset.props.mimeType).toBe('image/png')
				}
			})

			it('should support relation property in nodes and create correct shapes', async () => {
				const testOcif = JSON.stringify({
					ocif: 'https://canvasprotocol.org/ocif/v0.5',
					nodes: [
						{
							id: 'node1',
							position: [0, 0],
							size: [50, 50],
							data: [{ type: '@ocif/node/rect', strokeColor: '#00FF00', fillColor: 'transparent' }],
							relation: 'relation1',
						},
					],
					relations: [
						{
							id: 'relation1',
							node: 'node1',
							data: [
								{
									type: '@ocif/rel/edge',
									start: 'node1',
									end: 'node2',
								},
							],
						},
					],
				})

				const parseResult = parseOcifFile({
					json: testOcif,
					schema: editor.store.schema,
				})

				if (!parseResult.ok) {
					console.error('Parse error (relation test):', parseResult.error)
				}
				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())

					// Check that shapes were created
					const shapes = records.filter((r) => r.typeName === 'shape')
					expect(shapes).toHaveLength(1)

					const shape = shapes[0] as any
					expect(shape.id).toBe('shape:node1')
					expect(shape.type).toBe('geo')
					expect(shape.props.geo).toBe('rectangle')
					expect(shape.props.color).toBe('green') // Should convert #00FF00 to 'green'
					expect(shape.props.fill).toBe('none') // Should convert 'transparent' to 'none'

					// Check that bindings were created
					const bindings = records.filter((r) => r.typeName === 'binding')
					expect(bindings).toHaveLength(1)

					const binding = bindings[0] as any
					expect(binding.id).toBe('binding:relation1')
					expect(binding.type).toBe('arrow')
					expect(binding.fromId).toBe('shape:node1')
					expect(binding.toId).toBe('shape:node2')
				}
			})
		})

		describe('Resources structure', () => {
			it('should support representations array in resources and create assets', async () => {
				const testOcif = JSON.stringify({
					ocif: 'https://canvasprotocol.org/ocif/v0.5',
					nodes: [
						{
							id: 'image-node',
							position: [0, 0],
							size: [200, 150],
							resource: 'resource1',
							data: [{ type: '@tldraw/node/image' }],
						},
					],
					resources: [
						{
							id: 'resource1',
							representations: [
								{
									location: 'https://example.com/image.png',
									mimeType: 'image/png',
								},
								{
									content: 'data:image/png;base64,iVBOR...',
									mimeType: 'image/png',
								},
							],
						},
					],
				})

				const parseResult = parseOcifFile({
					json: testOcif,
					schema: editor.store.schema,
				})

				if (!parseResult.ok) {
					console.error('Parse error (representations test):', parseResult.error)
				}
				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())

					// Check that assets were created from representations
					const assets = records.filter((r) => r.typeName === 'asset')
					expect(assets).toHaveLength(1)

					const asset = assets[0] as any
					// Should use the first representation (location)
					expect(asset.props.src).toBe('https://example.com/image.png')
					expect(asset.props.mimeType).toBe('image/png')

					// Check that image shapes reference the asset
					const shapes = records.filter((r) => r.typeName === 'shape')
					expect(shapes).toHaveLength(1)

					const shape = shapes[0] as any
					expect(shape.type).toBe('image')
					expect(shape.props.assetId).toBeDefined()
				}
			})

			it('should support location, mimeType, and content in representations', async () => {
				const testOcif = JSON.stringify({
					ocif: 'https://canvasprotocol.org/ocif/v0.5',
					nodes: [],
					resources: [
						{
							id: 'resource1',
							representations: [
								{
									location: 'https://example.com/image.png',
									mimeType: 'image/png',
								},
							],
						},
						{
							id: 'resource2',
							representations: [
								{
									content: 'data:image/png;base64,iVBOR...',
									mimeType: 'image/png',
								},
							],
						},
					],
				})

				const parseResult = parseOcifFile({
					json: testOcif,
					schema: editor.store.schema,
				})

				if (!parseResult.ok) {
					console.error('Parse error (location/content test):', parseResult.error)
				}
				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())
					const assets = records.filter((r) => r.typeName === 'asset')

					expect(assets).toHaveLength(2)

					// Check location-based asset
					const locationAsset = assets.find(
						(a: any) => a.props.src === 'https://example.com/image.png'
					) as any
					expect(locationAsset).toBeDefined()
					expect(locationAsset.props.src).toBe('https://example.com/image.png')

					// Check content-based asset
					const contentAsset = assets.find(
						(a: any) => a.props.src === 'data:image/png;base64,iVBOR...'
					) as any
					expect(contentAsset).toBeDefined()
					expect(contentAsset.props.src).toBe('data:image/png;base64,iVBOR...')
				}
			})
		})

		describe('Relations structure', () => {
			it('should support node property in relations and create bindings', async () => {
				const testOcif = JSON.stringify({
					ocif: 'https://canvasprotocol.org/ocif/v0.5',
					nodes: [
						{
							id: 'node1',
							position: [0, 0],
							size: [100, 100],
							data: [{ type: '@ocif/node/rect' }],
						},
						{
							id: 'node2',
							position: [200, 0],
							size: [100, 100],
							data: [{ type: '@ocif/node/rect' }],
						},
					],
					relations: [
						{
							id: 'relation1',
							node: 'node1',
							data: [
								{
									type: '@ocif/rel/edge',
									start: 'node1',
									end: 'node2',
								},
							],
						},
					],
				})

				const parseResult = parseOcifFile({
					json: testOcif,
					schema: editor.store.schema,
				})

				if (!parseResult.ok) {
					console.error('Parse error (node relations test):', parseResult.error)
				}
				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())

					// Check that shapes were created
					const shapes = records.filter((r) => r.typeName === 'shape')
					expect(shapes).toHaveLength(2)

					// Check that bindings were created
					const bindings = records.filter((r) => r.typeName === 'binding')
					expect(bindings).toHaveLength(1)

					const binding = bindings[0] as any
					expect(binding.id).toBe('binding:relation1')
					expect(binding.type).toBe('arrow')
					expect(binding.fromId).toBe('shape:node1')
					expect(binding.toId).toBe('shape:node2')
					expect(binding.props).toBeDefined()
				}
			})

			it('should export relations with node property when creating relations', async () => {
				// Create shapes that will have a binding/relation
				const shape1Id = createShapeId('shape1')
				const shape2Id = createShapeId('shape2')

				editor.createShapes([
					{
						id: shape1Id,
						type: 'geo',
						x: 0,
						y: 0,
						props: { geo: 'rectangle', w: 100, h: 100 },
					},
					{
						id: shape2Id,
						type: 'geo',
						x: 200,
						y: 0,
						props: { geo: 'rectangle', w: 100, h: 100 },
					},
				])

				// Create an arrow binding between them
				const arrowId = createShapeId('arrow')
				editor.createShape({
					id: arrowId,
					type: 'arrow',
					x: 0,
					y: 0,
					props: {
						start: { x: 50, y: 50 },
						end: { x: 250, y: 50 },
						arrowheadStart: 'none',
						arrowheadEnd: 'arrow',
					},
				})

				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				// Should have 3 nodes (2 rectangles + 1 arrow)
				expect(ocifData.nodes).toHaveLength(3)

				// Find the arrow node
				const arrowNode = ocifData.nodes.find((n) =>
					n.data.some((d) => d.type === '@ocif/node/arrow')
				)
				expect(arrowNode).toBeDefined()
				expect(arrowNode!.id).toBe(arrowId)

				// Test round-trip: import back and verify shapes are created correctly
				const parseResult = parseOcifFile({
					json: ocifJson,
					schema: editor.store.schema,
				})

				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())
					const shapes = records.filter((r) => r.typeName === 'shape')

					expect(shapes).toHaveLength(3)

					// Verify the arrow shape
					const importedArrow = shapes.find((s: any) => s.type === 'arrow') as any
					expect(importedArrow).toBeDefined()
					expect(importedArrow.props.start).toEqual({ x: 50, y: 50 })
					expect(importedArrow.props.end).toEqual({ x: 250, y: 50 })
				}
			})
		})

		describe('Schemas structure', () => {
			it('should support all schema properties: uri, schema, location, name', async () => {
				const testOcif = JSON.stringify({
					ocif: 'https://canvasprotocol.org/ocif/v0.5',
					nodes: [],
					schemas: [
						{
							name: '@ocif/node/rect',
							uri: 'https://spec.canvasprotocol.org/v0.5/core/rect-node.json',
							location: 'https://spec.canvasprotocol.org/v0.5/core/rect-node.json',
							schema: {
								type: 'object',
								properties: {
									type: { const: '@ocif/node/rect' },
									strokeColor: { type: 'string' },
								},
							},
						},
					],
				})

				const parseResult = parseOcifFile({
					json: testOcif,
					schema: editor.store.schema,
				})

				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					// The schemas themselves don't create records, but parsing should succeed
					// and the schema information should be available for validation
					const records = Array.from(parseResult.value.allRecords())
					expect(records).toBeDefined()
				}
			})

			it('should include schema and location properties in exported schemas', async () => {
				editor.createShape({
					id: createShapeId('test'),
					type: 'geo',
					x: 0,
					y: 0,
					props: { geo: 'rectangle', w: 100, h: 100 },
				})

				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				expect(ocifData.schemas).toBeDefined()
				expect(ocifData.schemas!.length).toBeGreaterThan(0)

				const schema = ocifData.schemas![0]
				expect(schema).toHaveProperty('name')
				expect(schema).toHaveProperty('uri')
				// These should be added to match spec
				expect(schema).toHaveProperty('location')
				expect(schema).toHaveProperty('schema')

				// Verify schema content
				expect(schema.schema).toBeDefined()
				expect(schema.schema.type).toBe('object')
				expect(schema.schema.properties).toBeDefined()
			})

			it('should include required schemas in export', async () => {
				editor.createShape({
					id: createShapeId('test'),
					type: 'geo',
					x: 0,
					y: 0,
					props: { geo: 'rectangle', w: 100, h: 100 },
				})

				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				expect(ocifData.schemas).toBeDefined()
				// Should only include schemas that are actually used
				expect(ocifData.schemas!.length).toBe(1) // Only rect schema should be included

				const rectSchema = ocifData.schemas!.find((s) => s.name === '@ocif/node/rect')
				expect(rectSchema).toBeDefined()
				expect(rectSchema!.name).toBe('@ocif/node/rect')
				expect(rectSchema!.uri).toBe('https://spec.canvasprotocol.org/v0.5/core/rect-node.json')
				expect(rectSchema!.location).toBe(
					'https://spec.canvasprotocol.org/v0.5/core/rect-node.json'
				)
				expect(rectSchema!.schema.type).toBe('object')
				expect(rectSchema!.schema.properties.type).toEqual({ const: '@ocif/node/rect' })
				expect(rectSchema!.schema.properties.strokeColor).toEqual({ type: 'string' })
				expect(rectSchema!.schema.properties.fillColor).toEqual({ type: 'string' })
				expect(rectSchema!.schema.properties.strokeWidth).toEqual({ type: 'number' })
			})
		})
	})

	describe('New OCIF v0.5 features', () => {
		describe('Group relations', () => {
			it('should export and import group relations', async () => {
				// Create shapes and group them
				const shape1Id = createShapeId('shape1')
				const shape2Id = createShapeId('shape2')
				const groupId = createShapeId('group1')

				editor.createShapes([
					{
						id: shape1Id,
						type: 'geo',
						x: 0,
						y: 0,
						props: { geo: 'rectangle', w: 100, h: 100 },
					},
					{
						id: shape2Id,
						type: 'geo',
						x: 150,
						y: 0,
						props: { geo: 'rectangle', w: 100, h: 100 },
					},
				])

				// Group the shapes
				editor.groupShapes([shape1Id, shape2Id], { groupId })

				// Export to OCIF
				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				// Should have group relation
				expect(ocifData.relations).toBeDefined()
				const groupRelation = ocifData.relations!.find((r) =>
					r.data.some((d) => d.type === '@ocif/rel/group')
				)
				expect(groupRelation).toBeDefined()
				expect(groupRelation!.cascadeDelete).toBe(true)
				expect(groupRelation!.data[0].members).toContain(shape1Id)
				expect(groupRelation!.data[0].members).toContain(shape2Id)

				// Import back
				const parseResult = parseOcifFile({
					json: ocifJson,
					schema: editor.store.schema,
				})

				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())
					const shapes = records.filter((r) => r.typeName === 'shape')
					const groups = shapes.filter((s: any) => s.type === 'group')

					expect(groups).toHaveLength(1)

					const childShapes = shapes.filter((s: any) => s.type !== 'group')
					expect(childShapes).toHaveLength(2)

					// Check that child shapes have the group as parent
					for (const shape of childShapes) {
						expect((shape as any).parentId).toBe(groups[0].id)
					}
				}
			})
		})

		describe('Text nodes', () => {
			it('should export and import text shapes as text nodes', async () => {
				const textId = createShapeId('text1')
				editor.createShape({
					id: textId,
					type: 'text',
					x: 100,
					y: 200,
					props: {
						richText: toRichText('Hello World'),
						color: 'blue',
						size: 'l',
						font: 'draw',
						textAlign: 'middle',
					},
				})

				// Export to OCIF
				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				// Should have text node
				expect(ocifData.nodes).toHaveLength(1)
				const textNode = ocifData.nodes[0]
				expect(textNode.data[0].type).toBe('@ocif/node/rect')
				expect(textNode.data[0].text).toBe('Hello World')
				expect(textNode.data[0].textColor).toBe('#0066CC') // blue
				expect(textNode.data[0].textAlign).toBe('middle')

				// Import back
				const parseResult = parseOcifFile({
					json: ocifJson,
					schema: editor.store.schema,
				})

				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())
					const shapes = records.filter((r) => r.typeName === 'shape')

					expect(shapes).toHaveLength(1)
					const textShape = shapes[0] as any
					expect(textShape.type).toBe('text')
					expect(textShape.props.color).toBe('blue')
					expect(textShape.props.textAlign).toBe('middle')
				}
			})
		})

		describe('Path nodes', () => {
			it('should export and import draw shapes as path nodes', async () => {
				const drawId = createShapeId('draw1')
				editor.createShape({
					id: drawId,
					type: 'draw',
					x: 0,
					y: 0,
					props: {
						segments: [
							{
								type: 'free',
								points: [
									{ x: 0, y: 0, z: 0.5 },
									{ x: 50, y: 25, z: 0.5 },
									{ x: 100, y: 0, z: 0.5 },
								],
							},
						],
						color: 'red',
						size: 'm',
						isClosed: false,
					},
				})

				// Export to OCIF
				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				// Should have path node
				expect(ocifData.nodes).toHaveLength(1)
				const pathNode = ocifData.nodes[0]
				expect(pathNode.data[0].type).toBe('@ocif/node/path')
				expect(pathNode.data[0].strokeColor).toBe('#FF0000') // red
				expect(pathNode.data[0].closed).toBe(false)
				expect(pathNode.data[0].path).toBeDefined()

				// Import back
				const parseResult = parseOcifFile({
					json: ocifJson,
					schema: editor.store.schema,
				})

				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())
					const shapes = records.filter((r) => r.typeName === 'shape')

					expect(shapes).toHaveLength(1)
					const drawShape = shapes[0] as any
					expect(drawShape.type).toBe('draw')
					expect(drawShape.props.color).toBe('red')
					expect(drawShape.props.isClosed).toBe(false)
				}
			})
		})

		describe('Proper image nodes', () => {
			it('should export and import image shapes as rectangles with resource references', async () => {
				// Create an asset first
				const assetId = AssetRecordType.createId('test-asset')
				const asset = AssetRecordType.create({
					id: assetId,
					type: 'image',
					props: {
						name: 'test-image.png',
						src: 'data:image/png;base64,iVBOR...',
						w: 200,
						h: 150,
						mimeType: 'image/png',
						isAnimated: false,
						fileSize: undefined,
					},
				})
				editor.store.put([asset])

				const imageId = createShapeId('image1')
				editor.createShape({
					id: imageId,
					type: 'image',
					x: 50,
					y: 75,
					props: {
						w: 200,
						h: 150,
						assetId: assetId,
					},
				})

				// Export to OCIF
				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				// Should have image as pure resource node (no shape data)
				expect(ocifData.nodes).toHaveLength(1)
				const imageNode = ocifData.nodes[0]
				expect(imageNode.data).toHaveLength(0) // No shape data for pure resource nodes
				expect(imageNode.resource).toBe(assetId)
				expect(imageNode.resourceFit).toBe('contain')

				// Should have resource
				expect(ocifData.resources).toBeDefined()
				expect(ocifData.resources!).toHaveLength(1)
				const resource = ocifData.resources![0]
				expect(resource.representations).toBeDefined()
				expect(resource.representations![0].content).toBe('data:image/png;base64,iVBOR...')

				// Import back
				const parseResult = parseOcifFile({
					json: ocifJson,
					schema: editor.store.schema,
				})

				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())
					const shapes = records.filter((r) => r.typeName === 'shape')
					const assets = records.filter((r) => r.typeName === 'asset')

					expect(shapes).toHaveLength(1)
					expect(assets).toHaveLength(1)

					const imageShape = shapes[0] as any
					expect(imageShape.type).toBe('image')
					expect(imageShape.props.assetId).toBeDefined()
				}
			})
		})

		describe('Arrow bindings', () => {
			it('should export and import arrows with bindings correctly', async () => {
				// Create shapes for arrow to connect
				const shape1Id = createShapeId('shape1')
				const shape2Id = createShapeId('shape2')

				editor.createShapes([
					{
						id: shape1Id,
						type: 'geo',
						x: 0,
						y: 0,
						props: { geo: 'rectangle', w: 100, h: 100 },
					},
					{
						id: shape2Id,
						type: 'geo',
						x: 200,
						y: 0,
						props: { geo: 'rectangle', w: 100, h: 100 },
					},
				])

				// Create arrow and bind it
				const arrowId = createShapeId('arrow1')
				editor.createShape({
					id: arrowId,
					type: 'arrow',
					x: 0,
					y: 0,
					props: {
						start: { x: 50, y: 50 },
						end: { x: 250, y: 50 },
						arrowheadStart: 'none',
						arrowheadEnd: 'arrow',
					},
				})

				// Create bindings
				editor.createBinding({
					type: 'arrow',
					fromId: arrowId,
					toId: shape1Id,
					props: {
						terminal: 'start',
						normalizedAnchor: { x: 0.5, y: 0.5 },
						isExact: false,
						isPrecise: false,
						snap: 'none',
					},
				})

				editor.createBinding({
					type: 'arrow',
					fromId: arrowId,
					toId: shape2Id,
					props: {
						terminal: 'end',
						normalizedAnchor: { x: 0.5, y: 0.5 },
						isExact: false,
						isPrecise: false,
						snap: 'none',
					},
				})

				// Export to OCIF
				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				// Should have arrow node and edge relations
				expect(ocifData.nodes).toHaveLength(3) // 2 rectangles + 1 arrow
				expect(ocifData.relations).toBeDefined()

				const edgeRelations = ocifData.relations!.filter((r) =>
					r.data.some((d) => d.type === '@ocif/rel/edge')
				)
				expect(edgeRelations).toHaveLength(2) // start and end bindings

				// Import back
				const parseResult = parseOcifFile({
					json: ocifJson,
					schema: editor.store.schema,
				})

				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())
					const shapes = records.filter((r) => r.typeName === 'shape')
					const bindings = records.filter((r) => r.typeName === 'binding')

					expect(shapes).toHaveLength(3)
					expect(bindings).toHaveLength(2)

					const arrows = shapes.filter((s: any) => s.type === 'arrow')
					expect(arrows).toHaveLength(1)
				}
			})
		})
	})

	describe('OCIF v0.5 Extensions', () => {
		describe('Node Transforms Extension', () => {
			it('should export and import scale property from node transforms extension', async () => {
				const scaleId = createShapeId('scale-test')
				editor.createShape({
					id: scaleId,
					type: 'geo',
					x: 100,
					y: 100,
					props: {
						geo: 'rectangle',
						w: 100,
						h: 100,
						color: 'blue',
						scale: 2.5, // Test scale property
					},
				})

				// Export to OCIF
				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				// Should have node transforms extension
				expect(ocifData.nodes).toHaveLength(1)
				const node = ocifData.nodes[0]
				const transformsExtension = node.data.find((d) => d.type === '@ocif/node/transforms')
				expect(transformsExtension).toBeDefined()
				expect(transformsExtension!.scale).toBe(2.5)
				expect(transformsExtension!.rotation).toBe(0)
				expect(transformsExtension!.offset).toEqual([0, 0])

				// Import back
				const parseResult = parseOcifFile({
					json: ocifJson,
					schema: editor.store.schema,
				})

				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())
					const shapes = records.filter((r) => r.typeName === 'shape')

					expect(shapes).toHaveLength(1)
					const shape = shapes[0] as any
					expect(shape.type).toBe('geo')
					expect(shape.props.scale).toBe(2.5)
				}
			})

			it('should handle scale property in draw shapes', async () => {
				const drawId = createShapeId('draw-scale')
				editor.createShape({
					id: drawId,
					type: 'draw',
					x: 0,
					y: 0,
					props: {
						segments: [
							{
								type: 'free',
								points: [
									{ x: 0, y: 0, z: 0.5 },
									{ x: 50, y: 25, z: 0.5 },
									{ x: 100, y: 0, z: 0.5 },
								],
							},
						],
						color: 'red',
						fill: 'none',
						dash: 'draw',
						size: 'm',
						isComplete: true,
						isClosed: false,
						isPen: false,
						scale: 1.5,
					},
				})

				// Export to OCIF
				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				// Should have node transforms extension
				const node = ocifData.nodes[0]
				const transformsExtension = node.data.find((d) => d.type === '@ocif/node/transforms')
				expect(transformsExtension).toBeDefined()
				expect(transformsExtension!.scale).toBe(1.5)

				// Import back and verify scale is preserved
				const parseResult = parseOcifFile({
					json: ocifJson,
					schema: editor.store.schema,
				})

				if (!parseResult.ok) {
					console.error('Parse failed with error:', parseResult.error)
					console.error('OCIF JSON:', JSON.stringify(ocifData, null, 2))
				}
				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())
					const shapes = records.filter((r) => r.typeName === 'shape')

					expect(shapes).toHaveLength(1)
					const shape = shapes[0] as any
					expect(shape.type).toBe('draw')
					expect(shape.props.scale).toBe(1.5)
				}
			})
		})

		describe('Text Style Extension', () => {
			it('should export and import text style extension for rich text', async () => {
				const textId = createShapeId('text-style')
				editor.createShape({
					id: textId,
					type: 'text',
					x: 100,
					y: 200,
					props: {
						richText: toRichText('Styled Text'),
						color: 'red',
						size: 'l',
						font: 'sans',
						textAlign: 'middle',
					},
				})

				// Export to OCIF
				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				// Should have text style extension
				const node = ocifData.nodes[0]
				const textStyleExtension = node.data.find((d) => d.type === '@ocif/node/textstyle')
				expect(textStyleExtension).toBeDefined()
				expect(textStyleExtension!.fontSizePx).toBe(32) // l size * 4
				expect(textStyleExtension!.fontFamily).toBe('sans-serif')
				expect(textStyleExtension!.color).toBe('#FF0000')
				expect(textStyleExtension!.align).toBe('center')
				expect(textStyleExtension!.bold).toBe(false)
				expect(textStyleExtension!.italic).toBe(false)

				// Import back
				const parseResult = parseOcifFile({
					json: ocifJson,
					schema: editor.store.schema,
				})

				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())
					const shapes = records.filter((r) => r.typeName === 'shape')

					expect(shapes).toHaveLength(1)
					const shape = shapes[0] as any
					expect(shape.type).toBe('text')
					expect(shape.props.color).toBe('red')
					expect(shape.props.font).toBe('sans')
					expect(shape.props.textAlign).toBe('middle')
				}
			})
		})

		describe('Parent-Child Relation for Frames', () => {
			it('should export and import frame shapes with parent-child relations', async () => {
				// Create shapes and a frame
				const shape1Id = createShapeId('shape1')
				const shape2Id = createShapeId('shape2')
				const frameId = createShapeId('frame1')

				editor.createShapes([
					{
						id: shape1Id,
						type: 'geo',
						x: 10,
						y: 10,
						props: { geo: 'rectangle', w: 50, h: 50 },
					},
					{
						id: shape2Id,
						type: 'geo',
						x: 70,
						y: 10,
						props: { geo: 'rectangle', w: 50, h: 50 },
					},
					{
						id: frameId,
						type: 'frame',
						x: 0,
						y: 0,
						props: { w: 200, h: 100, name: 'Test Frame', color: 'blue' },
					},
				])

				// Reparent shapes to frame
				editor.reparentShapes([shape1Id, shape2Id], frameId)

				// Export to OCIF
				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				// Should have parent-child relations
				expect(ocifData.relations).toBeDefined()
				const parentChildRelations = ocifData.relations!.filter((r) =>
					r.data.some((d) => d.type === '@ocif/rel/parent-child')
				)
				expect(parentChildRelations).toHaveLength(2) // One for each child

				// Should have frame node
				const frameNode = ocifData.nodes.find((n) => n.id === frameId)
				expect(frameNode).toBeDefined()
				const frameData = frameNode!.data.find((d) => d.isFrame)
				expect(frameData).toBeDefined()
				expect(frameData!.frameName).toBe('Test Frame')

				// Import back
				const parseResult = parseOcifFile({
					json: ocifJson,
					schema: editor.store.schema,
				})

				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())
					const shapes = records.filter((r) => r.typeName === 'shape')

					// Should have frame and child shapes
					const frames = shapes.filter((s: any) => s.type === 'frame')
					const childShapes = shapes.filter((s: any) => s.type !== 'frame')

					expect(frames).toHaveLength(1)
					expect(childShapes).toHaveLength(2)

					const frame = frames[0] as any
					expect(frame.props.name).toBe('Test Frame')
					expect(frame.props.color).toBe('blue')

					// Check that child shapes have the frame as parent
					for (const shape of childShapes) {
						expect((shape as any).parentId).toBe(frame.id)
					}
				}
			})
		})

		describe('Ports Extension for Arrow Bindings', () => {
			it('should export ports extension for precise arrow bindings', async () => {
				// Create shapes for arrow to connect
				const shape1Id = createShapeId('shape1')
				const shape2Id = createShapeId('shape2')
				const arrowId = createShapeId('arrow1')

				editor.createShapes([
					{
						id: shape1Id,
						type: 'geo',
						x: 0,
						y: 0,
						props: { geo: 'rectangle', w: 100, h: 100 },
					},
					{
						id: shape2Id,
						type: 'geo',
						x: 200,
						y: 0,
						props: { geo: 'rectangle', w: 100, h: 100 },
					},
					{
						id: arrowId,
						type: 'arrow',
						x: 0,
						y: 0,
						props: {
							start: { x: 50, y: 50 },
							end: { x: 250, y: 50 },
						},
					},
				])

				// Create precise bindings
				editor.createBinding({
					type: 'arrow',
					fromId: arrowId,
					toId: shape1Id,
					props: {
						terminal: 'start',
						normalizedAnchor: { x: 0.8, y: 0.5 }, // Precise anchor
						isExact: false,
						isPrecise: true, // This should trigger ports extension
						snap: 'none',
					},
				})

				editor.createBinding({
					type: 'arrow',
					fromId: arrowId,
					toId: shape2Id,
					props: {
						terminal: 'end',
						normalizedAnchor: { x: 0.2, y: 0.5 },
						isExact: false,
						isPrecise: true,
						snap: 'none',
					},
				})

				// Export to OCIF
				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				// Should have edge relations with ports extension
				expect(ocifData.relations).toBeDefined()
				const edgeRelations = ocifData.relations!.filter((r) =>
					r.data.some((d) => d.type === '@ocif/rel/edge')
				)
				expect(edgeRelations.length).toBeGreaterThan(0)

				// Check for ports extension in relations
				const relationWithPorts = edgeRelations.find((r) =>
					r.data.some((d) => d.type === '@ocif/node/ports')
				)
				expect(relationWithPorts).toBeDefined()

				const portsData = relationWithPorts!.data.find((d) => d.type === '@ocif/node/ports')
				expect(portsData).toBeDefined()
				expect(portsData!.normalizedAnchor).toBeDefined()
				expect(portsData!.terminal).toBeDefined()
			})
		})

		describe('Hyperedge Relation Import', () => {
			it('should import hyperedge relations as multiple arrow bindings', async () => {
				const testOcif = JSON.stringify({
					ocif: 'https://canvasprotocol.org/ocif/v0.5',
					nodes: [
						{
							id: 'node1',
							position: [0, 0],
							size: [100, 100],
							data: [{ type: '@ocif/node/rect' }],
						},
						{
							id: 'node2',
							position: [200, 0],
							size: [100, 100],
							data: [{ type: '@ocif/node/rect' }],
						},
						{
							id: 'node3',
							position: [400, 0],
							size: [100, 100],
							data: [{ type: '@ocif/node/rect' }],
						},
					],
					relations: [
						{
							id: 'hyperedge1',
							data: [
								{
									type: '@ocif/rel/hyperedge',
									endpoints: [
										{ id: 'node1', direction: 'in' },
										{ id: 'node2', direction: 'in' },
										{ id: 'node3', direction: 'out' },
									],
								},
							],
						},
					],
				})

				const parseResult = parseOcifFile({
					json: testOcif,
					schema: editor.store.schema,
				})

				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())
					const shapes = records.filter((r) => r.typeName === 'shape')
					const bindings = records.filter((r) => r.typeName === 'binding')

					expect(shapes).toHaveLength(3)
					expect(bindings.length).toBeGreaterThan(0) // Should create arrow bindings from hyperedge

					// Check that bindings connect input nodes to output node
					const hyperedgeBindings = bindings.filter((b: any) => b.id.includes('hyperedge'))
					expect(hyperedgeBindings.length).toBeGreaterThan(0)
				}
			})

			it('should handle undirected hyperedge endpoints', async () => {
				const testOcif = JSON.stringify({
					ocif: 'https://canvasprotocol.org/ocif/v0.5',
					nodes: [
						{
							id: 'node1',
							position: [0, 0],
							size: [100, 100],
							data: [{ type: '@ocif/node/rect' }],
						},
						{
							id: 'node2',
							position: [200, 0],
							size: [100, 100],
							data: [{ type: '@ocif/node/rect' }],
						},
						{
							id: 'node3',
							position: [400, 0],
							size: [100, 100],
							data: [{ type: '@ocif/node/rect' }],
						},
					],
					relations: [
						{
							id: 'hyperedge-undir',
							data: [
								{
									type: '@ocif/rel/hyperedge',
									endpoints: [
										{ id: 'node1', direction: 'undir' },
										{ id: 'node2', direction: 'undir' },
										{ id: 'node3', direction: 'undir' },
									],
								},
							],
						},
					],
				})

				const parseResult = parseOcifFile({
					json: testOcif,
					schema: editor.store.schema,
				})

				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())
					const bindings = records.filter((r) => r.typeName === 'binding')

					// Should create connections between undirected endpoints
					const undirBindings = bindings.filter((b: any) => b.id.includes('hyperedge-undir'))
					expect(undirBindings.length).toBeGreaterThan(0)
				}
			})
		})

		describe('Extensions Schema Validation', () => {
			it('should include extension schemas when extensions are used', async () => {
				// Create shapes that use extensions
				const shape1Id = createShapeId('shape1')
				const shape2Id = createShapeId('shape2')
				const frameId = createShapeId('frame1')
				const textId = createShapeId('text1')
				const scaleShapeId = createShapeId('scale-shape')

				editor.createShapes([
					{
						id: shape1Id,
						type: 'geo',
						x: 10,
						y: 10,
						props: { geo: 'rectangle', w: 50, h: 50 },
					},
					{
						id: shape2Id,
						type: 'geo',
						x: 70,
						y: 10,
						props: { geo: 'rectangle', w: 50, h: 50 },
					},
					{
						id: frameId,
						type: 'frame',
						x: 0,
						y: 0,
						props: { w: 200, h: 100, name: 'Test Frame' },
					},
					{
						id: textId,
						type: 'text',
						x: 100,
						y: 200,
						props: {
							richText: toRichText('Styled Text'),
							color: 'red',
							size: 'l',
							font: 'sans',
							textAlign: 'middle',
						},
					},
					{
						id: scaleShapeId,
						type: 'geo',
						x: 200,
						y: 200,
						props: {
							geo: 'rectangle',
							w: 100,
							h: 100,
							scale: 2.0, // This should trigger transforms extension
						},
					},
				])

				// Reparent shapes to frame (triggers parent-child relation)
				editor.reparentShapes([shape1Id, shape2Id], frameId)

				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				expect(ocifData.schemas).toBeDefined()

				// Check for extension schemas that should be present
				const expectedSchemas = [
					'@ocif/node/transforms', // from scale shape
					'@ocif/node/textstyle', // from text shape
					'@ocif/rel/parent-child', // from frame relations
				]

				for (const schemaName of expectedSchemas) {
					const schema = ocifData.schemas!.find((s) => s.name === schemaName)
					expect(schema).toBeDefined()
					expect(schema!.uri).toContain('v0.5/extensions')
					expect(schema!.location).toContain('v0.5/extensions')
					expect(schema!.schema).toBeDefined()
				}
			})
		})

		describe('Note (Sticky Note) Support', () => {
			it('should export and import note shapes with custom tldraw extension', async () => {
				const noteId = createShapeId('note1')
				editor.createShape({
					id: noteId,
					type: 'note',
					x: 100,
					y: 200,
					props: {
						richText: toRichText('This is a sticky note'),
						color: 'yellow',
						labelColor: 'black',
						size: 'm',
						font: 'draw',
						align: 'middle',
						verticalAlign: 'middle',
						growY: 0,
						url: '',
						scale: 1,
						fontSizeAdjustment: 0,
					},
				})

				// Export to OCIF
				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				// Should have note node with custom tldraw extension
				expect(ocifData.nodes).toHaveLength(1)
				const noteNode = ocifData.nodes[0]
				const noteData = noteNode.data.find((d) => d.type === '@tldraw/node/note')
				expect(noteData).toBeDefined()
				expect(noteData!.text).toBe('This is a sticky note')
				expect(noteData!.color).toBe('#FFDD00') // yellow
				expect(noteData!.labelColor).toBe('#000000') // black
				expect(noteData!.fontSizePx).toBe(22) // fontSizeAdjustment calculated by tldraw
				expect(noteData!.fontFamily).toBe('draw')
				expect(noteData!.align).toBe('middle')
				expect(noteData!.verticalAlign).toBe('middle')

				// Import back
				const parseResult = parseOcifFile({
					json: ocifJson,
					schema: editor.store.schema,
				})

				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())
					const shapes = records.filter((r) => r.typeName === 'shape')

					expect(shapes).toHaveLength(1)
					const noteShape = shapes[0] as any
					expect(noteShape.type).toBe('note')
					expect(noteShape.props.color).toBe('yellow')
					expect(noteShape.props.labelColor).toBe('black')
					expect(noteShape.props.font).toBe('draw')
					expect(noteShape.props.align).toBe('middle')
					expect(noteShape.props.verticalAlign).toBe('middle')
				}
			})
		})

		describe('Embed Support', () => {
			it('should export and import embed shapes with custom tldraw extension', async () => {
				const embedId = createShapeId('embed1')
				editor.createShape({
					id: embedId,
					type: 'embed',
					x: 50,
					y: 100,
					props: {
						w: 400,
						h: 300,
						url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
					},
				})

				// Export to OCIF
				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				// Should have embed node with custom tldraw extension
				expect(ocifData.nodes).toHaveLength(1)
				const embedNode = ocifData.nodes[0]
				const embedData = embedNode.data.find((d) => d.type === '@tldraw/node/embed')
				expect(embedData).toBeDefined()
				expect(embedData!.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

				// Import back
				const parseResult = parseOcifFile({
					json: ocifJson,
					schema: editor.store.schema,
				})

				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())
					const shapes = records.filter((r) => r.typeName === 'shape')

					expect(shapes).toHaveLength(1)
					const embedShape = shapes[0] as any
					expect(embedShape.type).toBe('embed')
					expect(embedShape.props.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
					expect(embedShape.props.w).toBe(400)
					expect(embedShape.props.h).toBe(300)
				}
			})
		})

		describe('Bookmark Support', () => {
			it('should export and import bookmark shapes with custom tldraw extension', async () => {
				// Create a bookmark asset first
				const assetId = AssetRecordType.createId('bookmark-asset')
				const asset = AssetRecordType.create({
					id: assetId,
					type: 'bookmark',
					props: {
						title: 'Example Website',
						description: 'A great example website',
						image: 'https://example.com/image.png',
						favicon: 'https://example.com/favicon.ico',
						src: 'https://example.com',
					},
				})
				editor.store.put([asset])

				const bookmarkId = createShapeId('bookmark1')
				editor.createShape({
					id: bookmarkId,
					type: 'bookmark',
					x: 200,
					y: 150,
					props: {
						w: 300,
						h: 320, // Bookmark shapes have a default height of 320
						assetId: assetId,
						url: 'https://example.com',
					},
				})

				// Export to OCIF
				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				// Should have bookmark node with custom tldraw extension
				expect(ocifData.nodes).toHaveLength(1)
				const bookmarkNode = ocifData.nodes[0]
				const bookmarkData = bookmarkNode.data.find((d) => d.type === '@tldraw/node/bookmark')
				expect(bookmarkData).toBeDefined()
				expect(bookmarkData!.assetId).toBe(assetId)
				expect(bookmarkData!.url).toBe('https://example.com')

				// Import back
				const parseResult = parseOcifFile({
					json: ocifJson,
					schema: editor.store.schema,
				})

				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())
					const shapes = records.filter((r) => r.typeName === 'shape')

					expect(shapes).toHaveLength(1)
					const bookmarkShape = shapes[0] as any
					expect(bookmarkShape.type).toBe('bookmark')
					expect(bookmarkShape.props.url).toBe('https://example.com')
					expect(bookmarkShape.props.w).toBe(300)
					expect(bookmarkShape.props.h).toBe(320) // Bookmark shapes have a default height
				}
			})
		})

		describe('Video Support', () => {
			it('should export and import video shapes with resource references', async () => {
				// Create a video asset first
				const assetId = AssetRecordType.createId('video-asset')
				const asset = AssetRecordType.create({
					id: assetId,
					type: 'video',
					props: {
						name: 'test-video.mp4',
						src: 'https://example.com/video.mp4',
						w: 640,
						h: 480,
						mimeType: 'video/mp4',
						isAnimated: true,
						fileSize: 1024000,
					},
				})
				editor.store.put([asset])

				const videoId = createShapeId('video1')
				editor.createShape({
					id: videoId,
					type: 'video',
					x: 100,
					y: 200,
					props: {
						w: 640,
						h: 480,
						assetId: assetId,
						time: 0,
						playing: false,
						url: '',
					},
				})

				// Export to OCIF
				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				// Should have video as pure resource node (no shape data)
				expect(ocifData.nodes).toHaveLength(1)
				const videoNode = ocifData.nodes[0]
				expect(videoNode.data).toHaveLength(0) // No shape data for pure resource nodes
				expect(videoNode.resource).toBe(assetId)
				expect(videoNode.resourceFit).toBe('contain')

				// Should have resource
				expect(ocifData.resources).toBeDefined()
				expect(ocifData.resources!).toHaveLength(1)
				const resource = ocifData.resources![0]
				expect(resource.representations).toBeDefined()
				expect(resource.representations![0].location).toBe('https://example.com/video.mp4')

				// Import back
				const parseResult = parseOcifFile({
					json: ocifJson,
					schema: editor.store.schema,
				})

				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())
					const shapes = records.filter((r) => r.typeName === 'shape')
					const assets = records.filter((r) => r.typeName === 'asset')

					expect(shapes).toHaveLength(1)
					expect(assets).toHaveLength(1)

					const videoShape = shapes[0] as any
					// Video shapes should be imported as video shapes
					expect(videoShape.type).toBe('video')
					expect(videoShape.props.assetId).toBeDefined()
				}
			})
		})

		describe('Highlight Support', () => {
			it('should export and import highlight shapes with custom tldraw extension', async () => {
				const highlightId = createShapeId('highlight1')
				editor.createShape({
					id: highlightId,
					type: 'highlight',
					x: 0,
					y: 0,
					props: {
						segments: [
							{
								type: 'free',
								points: [
									{ x: 0, y: 0, z: 0.5 },
									{ x: 100, y: 10, z: 0.5 },
									{ x: 200, y: 0, z: 0.5 },
								],
							},
						],
						color: 'yellow',
						size: 'l',
						isComplete: true,
						isPen: false,
						scale: 1,
					},
				})

				// Export to OCIF
				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				// Should have highlight node with custom tldraw extension
				expect(ocifData.nodes).toHaveLength(1)
				const highlightNode = ocifData.nodes[0]
				const highlightData = highlightNode.data.find((d) => d.type === '@tldraw/node/highlight')
				expect(highlightData).toBeDefined()
				expect(highlightData!.color).toBe('#FFDD00') // yellow
				expect(highlightData!.size).toBe(8) // l size
				expect(highlightData!.isComplete).toBe(true)
				expect(highlightData!.path).toBeDefined()

				// Import back
				const parseResult = parseOcifFile({
					json: ocifJson,
					schema: editor.store.schema,
				})

				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())
					const shapes = records.filter((r) => r.typeName === 'shape')

					expect(shapes).toHaveLength(1)
					const highlightShape = shapes[0] as any
					expect(highlightShape.type).toBe('highlight')
					expect(highlightShape.props.color).toBe('yellow')
					expect(highlightShape.props.isComplete).toBe(true)
				}
			})
		})

		describe('Line Support', () => {
			it('should export and import line shapes as enhanced path nodes', async () => {
				const lineId = createShapeId('line1')
				// Create line with proper points structure
				const startIndex = 'a1' as any
				const endIndex = 'a2' as any
				editor.createShape({
					id: lineId,
					type: 'line',
					x: 50,
					y: 100,
					props: {
						color: 'blue',
						size: 'm',
						spline: 'line',
						dash: 'draw',
						points: {
							[startIndex]: { id: startIndex, index: startIndex, x: 0, y: 0 },
							[endIndex]: { id: endIndex, index: endIndex, x: 200, y: 100 },
						},
						scale: 1,
					},
				})

				// Export to OCIF
				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				// Should have line as path node
				expect(ocifData.nodes).toHaveLength(1)
				const lineNode = ocifData.nodes[0]
				expect(lineNode.data[0].type).toBe('@ocif/node/path')
				expect(lineNode.data[0].strokeColor).toBe('#0066CC') // blue
				expect(lineNode.data[0].fillColor).toBe('transparent')
				expect(lineNode.data[0].strokeWidth).toBe(4) // m size
				expect(lineNode.data[0].closed).toBe(false)
				expect(lineNode.data[0].path).toContain('M') // Should contain move command

				// Import back
				const parseResult = parseOcifFile({
					json: ocifJson,
					schema: editor.store.schema,
				})

				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())
					const shapes = records.filter((r) => r.typeName === 'shape')

					expect(shapes).toHaveLength(1)
					const lineShape = shapes[0] as any
					expect(lineShape.type).toBe('draw') // Lines are imported as draw shapes
					expect(lineShape.props.color).toBe('blue')
					expect(lineShape.props.isClosed).toBe(false)
				}
			})
		})

		describe('Group Support', () => {
			it('should export and import group shapes via group relations', async () => {
				// Create shapes to group
				const shape1Id = createShapeId('shape1')
				const shape2Id = createShapeId('shape2')
				const groupId = createShapeId('group1')

				editor.createShapes([
					{
						id: shape1Id,
						type: 'geo',
						x: 10,
						y: 10,
						props: { geo: 'rectangle', w: 50, h: 50 },
					},
					{
						id: shape2Id,
						type: 'geo',
						x: 70,
						y: 10,
						props: { geo: 'rectangle', w: 50, h: 50 },
					},
				])

				// Group the shapes
				editor.groupShapes([shape1Id, shape2Id], { groupId })

				// Export to OCIF
				const ocifJson = await serializeTldrawToOcif(editor)
				const ocifData: OcifFile = JSON.parse(ocifJson)

				// Should have group relation
				expect(ocifData.relations).toBeDefined()
				const groupRelation = ocifData.relations!.find((r) =>
					r.data.some((d) => d.type === '@ocif/rel/group')
				)
				expect(groupRelation).toBeDefined()
				expect(groupRelation!.cascadeDelete).toBe(true)
				expect(groupRelation!.data[0].members).toContain(shape1Id)
				expect(groupRelation!.data[0].members).toContain(shape2Id)

				// Import back
				const parseResult = parseOcifFile({
					json: ocifJson,
					schema: editor.store.schema,
				})

				expect(parseResult.ok).toBe(true)
				if (parseResult.ok) {
					const records = Array.from(parseResult.value.allRecords())
					const shapes = records.filter((r) => r.typeName === 'shape')
					const groups = shapes.filter((s: any) => s.type === 'group')

					expect(groups).toHaveLength(1)

					const childShapes = shapes.filter((s: any) => s.type !== 'group')
					expect(childShapes).toHaveLength(2)

					// Check that child shapes have the group as parent
					for (const shape of childShapes) {
						expect((shape as any).parentId).toBe(groups[0].id)
					}
				}
			})
		})
	})

	describe('Basic shapes export/import', () => {
		it('should export and import a rectangle', async () => {
			// Create a rectangle
			editor.createShape({
				id: createShapeId('test-rect'),
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
				id: createShapeId('test-rect'),
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
				id: createShapeId('test-ellipse'),
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
				id: createShapeId('test-ellipse'),
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
				id: createShapeId('test-arrow'),
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
				id: createShapeId('test-arrow'),
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
					id: createShapeId('rect1'),
					type: 'geo',
					x: 0,
					y: 0,
					props: { geo: 'rectangle', w: 100, h: 100, color: 'blue' },
				},
				{
					id: createShapeId('ellipse1'),
					type: 'geo',
					x: 150,
					y: 0,
					props: { geo: 'ellipse', w: 100, h: 100, color: 'red' },
				},
				{
					id: createShapeId('arrow1'),
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
				const shapeId = createShapeId(tldraw)
				editor.createShape({
					id: shapeId,
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
				editor.deleteShape(shapeId)
			}
		})

		it('should handle transparent fills', async () => {
			editor.createShape({
				id: createShapeId('transparent'),
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
				id: createShapeId('test'),
				type: 'geo',
				x: 0,
				y: 0,
				props: { geo: 'rectangle', w: 100, h: 100 },
			})

			const blob = await serializeTldrawToOcifBlob(editor)

			expect(blob.type).toBe(OCIF_FILE_MIMETYPE)
			expect(blob.size).toBeGreaterThan(0)

			// Verify blob content by converting to string
			const text = await new Promise<string>((resolve) => {
				const reader = new FileReader()
				reader.onload = () => resolve(reader.result as string)
				reader.readAsText(blob)
			})
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

	describe('Round-trip consistency', () => {
		it('should maintain shape integrity through export/import cycle', async () => {
			const originalShapes = [
				{
					id: createShapeId('rect'),
					type: 'geo' as const,
					x: 10,
					y: 20,
					props: { geo: 'rectangle' as const, w: 100, h: 80, color: 'blue' as const },
				},
				{
					id: createShapeId('circle'),
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

	describe('Representations fallback', () => {
		it('should extract altText from plain text representations', async () => {
			const testOcif = JSON.stringify({
				ocif: 'https://canvasprotocol.org/ocif/v0.5',
				nodes: [
					{
						id: 'image-node',
						position: [0, 0],
						size: [200, 150],
						resource: 'resource1',
						data: [
							{ type: '@ocif/node/rect', strokeColor: 'transparent', fillColor: 'transparent' },
						],
					},
				],
				resources: [
					{
						id: 'resource1',
						representations: [
							{
								location: 'https://example.com/image.png',
								mimeType: 'image/png',
							},
							{
								content: 'A beautiful landscape with mountains and trees',
								mimeType: 'text/plain',
							},
						],
					},
				],
			})

			const parseResult = parseOcifFile({
				json: testOcif,
				schema: editor.store.schema,
			})

			expect(parseResult.ok).toBe(true)
			if (parseResult.ok) {
				const records = Array.from(parseResult.value.allRecords())
				const shapes = records.filter((r) => r.typeName === 'shape')

				expect(shapes).toHaveLength(1)
				const imageShape = shapes[0] as any
				expect(imageShape.type).toBe('image')
				expect(imageShape.props.altText).toBe('A beautiful landscape with mountains and trees')
			}
		})
	})
})
