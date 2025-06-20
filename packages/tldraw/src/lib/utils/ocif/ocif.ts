import {
	AssetRecordType,
	Editor,
	FileHelpers,
	Result,
	TLRecord,
	TLSchema,
	TLStore,
	createTLStore,
	fetch,
	toRichText,
	transact,
} from '@tldraw/editor'
import { renderPlaintextFromRichText } from '../text/richText'

/** @public */
export const OCIF_FILE_MIMETYPE = 'application/vnd.ocif+json' as const

/** @public */
export const OCIF_FILE_EXTENSION = '.ocif.json' as const

/** @public */
export interface OcifRepresentation {
	location?: string
	mimeType?: string
	content?: string
}

/** @public */
export interface OcifNode {
	id: string
	position: [number, number]
	size?: [number, number]
	resource?: string
	resourceFit?: string
	rotation?: number
	relation?: string
	data: Array<{
		type: string
		[key: string]: any
	}>
}

/** @public */
export interface OcifRelation {
	id: string
	node?: string
	data: Array<{
		type: string
		[key: string]: any
	}>
	cascadeDelete?: boolean
}

/** @public */
export interface OcifResource {
	id: string
	representations?: OcifRepresentation[]
	// Legacy support for current implementation
	data?: string
	mimeType?: string
}

/** @public */
export interface OcifSchema {
	name: string
	uri: string
	location?: string
	schema?: any
}

/** @public */
export interface OcifFile {
	ocif: string
	nodes: OcifNode[]
	relations?: OcifRelation[]
	resources?: OcifResource[]
	schemas?: OcifSchema[]
}

/** @public */
export type OcifFileParseError =
	| { type: 'notAnOcifFile'; cause: unknown }
	| { type: 'ocifVersionNotSupported'; version: string }
	| { type: 'invalidOcifStructure'; cause: unknown }

/** @public */
export async function serializeTldrawToOcif(editor: Editor): Promise<string> {
	// Get all current records (this automatically excludes deleted records)
	const records = editor.store.allRecords()
	const nodes: OcifNode[] = []
	const relations: OcifRelation[] = []
	const resources: OcifResource[] = []
	const usedExtensions = new Set<string>()

	// Track which schemas are actually used
	const usedSchemaTypes = new Set<string>()

	// Convert shapes to nodes
	for (const record of records) {
		if (record.typeName === 'shape') {
			const node = convertTldrawShapeToOcifNode(record as any, editor)
			if (node) {
				nodes.push(node)
				// Track used schema types
				node.data.forEach((data) => {
					usedSchemaTypes.add(data.type)
					if (data.type.startsWith('@ocif/')) {
						usedExtensions.add(data.type)
					}
				})
			}
		}
	}

	// Convert bindings to relations
	for (const record of records) {
		if (record.typeName === 'binding') {
			const relation = convertTldrawBindingToOcifRelation(record as any, editor)
			if (relation) {
				relations.push(relation)
				// Track used schema types
				relation.data.forEach((data) => {
					usedSchemaTypes.add(data.type)
					if (data.type.startsWith('@ocif/')) {
						usedExtensions.add(data.type)
					}
				})
			}
		}
	}

	// Convert assets to resources
	for (const record of records) {
		if (record.typeName === 'asset') {
			const resource = await convertTldrawAssetToOcifResource(record as any, editor)
			if (resource) {
				resources.push(resource)
			}
		}
	}

	// Handle group relations
	const groupsToMembers = new Map<string, string[]>()
	for (const record of records) {
		if (
			record.typeName === 'shape' &&
			(record as any).parentId &&
			(record as any).parentId !== editor.getCurrentPageId()
		) {
			const parentShape = editor.getShape((record as any).parentId)
			if (parentShape) {
				if (parentShape.type === 'group') {
					// Collect group members
					const groupId = (record as any).parentId
					if (!groupsToMembers.has(groupId)) {
						groupsToMembers.set(groupId, [])
					}
					groupsToMembers.get(groupId)!.push(record.id)
				} else if (parentShape.type === 'frame') {
					// Create parent-child relation for frame containment
					relations.push({
						id: `frame_${(record as any).parentId}_${record.id}`,
						node: record.id,
						data: [
							{
								type: '@ocif/rel/parent-child',
								parent: (record as any).parentId,
								child: record.id,
							},
						],
					})
					usedSchemaTypes.add('@ocif/rel/parent-child')
					usedExtensions.add('@ocif/rel/parent-child')
				}
			}
		}
	}

	// Create group relations
	for (const [groupId, members] of groupsToMembers) {
		relations.push({
			id: `group_${groupId}`,
			node: groupId,
			cascadeDelete: true,
			data: [
				{
					type: '@ocif/rel/group',
					members: members,
				},
			],
		})
		usedSchemaTypes.add('@ocif/rel/group')
		usedExtensions.add('@ocif/rel/group')
	}

	// Only include schemas that are actually used
	const schemas = getOcifSchemas().filter(
		(schema) => usedSchemaTypes.has(schema.name) || schema.name === 'ocif'
	)

	const ocifFile: OcifFile = {
		ocif: 'https://canvasprotocol.org/ocif/v0.5',
		nodes,
		relations: relations.length > 0 ? relations : undefined,
		resources: resources.length > 0 ? resources : undefined,
		schemas: schemas.length > 0 ? schemas : undefined,
	}

	return JSON.stringify(ocifFile, null, 2)
}

function calculateDrawShapeSize(segments: any[]): [number, number] {
	if (!segments || segments.length === 0) {
		return [100, 100]
	}

	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity

	for (const segment of segments) {
		if (segment.points && segment.points.length > 0) {
			for (const point of segment.points) {
				minX = Math.min(minX, point.x)
				minY = Math.min(minY, point.y)
				maxX = Math.max(maxX, point.x)
				maxY = Math.max(maxY, point.y)
			}
		}
	}

	if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
		return [100, 100]
	}

	return [Math.max(maxX - minX, 10), Math.max(maxY - minY, 10)]
}

function convertTldrawShapeToOcifNode(shape: any, editor: Editor): OcifNode | null {
	const position: [number, number] = [shape.x, shape.y]

	// Calculate size based on shape type
	let size: [number, number]
	if (shape.type === 'draw') {
		// For draw shapes, calculate bounding box from segments
		size = calculateDrawShapeSize(shape.props.segments)
	} else if (shape.type === 'text') {
		// For text shapes, use the text bounds
		size = [shape.props.w || 100, shape.props.h || 100]
	} else {
		// For other shapes, use w/h properties
		size = [shape.props.w || 100, shape.props.h || 100]
	}

	const data: Array<{ type: string; [key: string]: any }> = []

	switch (shape.type) {
		case 'geo': {
			// Determine the appropriate OCIF node type based on geo shape
			let nodeType = '@ocif/node/rect'
			if (shape.props.geo === 'ellipse' || shape.props.geo === 'oval') {
				nodeType = '@ocif/node/oval'
			}
			// All other geo shapes (triangle, diamond, pentagon, hexagon, octagon, star, etc.)
			// are exported as rectangles with geo-specific metadata

			const nodeData: any = {
				type: nodeType,
				strokeColor: convertTldrawColorToHex(shape.props.color),
				fillColor: convertTldrawFillToHex(shape.props.fill, shape.props.color),
				strokeWidth: convertTldrawSizeToPixels(shape.props.size),
			}

			// Add geo-specific metadata for non-standard shapes
			if (
				shape.props.geo !== 'rectangle' &&
				shape.props.geo !== 'ellipse' &&
				shape.props.geo !== 'oval'
			) {
				nodeData.geoType = shape.props.geo
			}

			// Add text content if present
			if (shape.props.text && shape.props.text.trim()) {
				nodeData.text =
					renderPlaintextFromRichText(editor, shape.props.richText) || shape.props.text
				nodeData.textColor = convertTldrawColorToHex(shape.props.labelColor || shape.props.color)
				nodeData.fontSize = convertTldrawSizeToPixels(shape.props.size) * 4
				nodeData.fontFamily = convertTldrawFontToCSS(shape.props.font || 'draw')
				nodeData.textAlign = shape.props.align || 'middle'
			}

			// Add node transforms extension if shape has scale
			if (shape.props.scale && shape.props.scale !== 1) {
				data.push({
					type: '@ocif/node/transforms',
					scale: shape.props.scale,
					rotation: 0,
					offset: [0, 0],
				})
			}

			data.push(nodeData)
			break
		}
		case 'text': {
			// Text nodes in OCIF are represented as rectangles with text content
			const textNodeData: any = {
				type: '@ocif/node/rect',
				strokeColor: 'transparent',
				fillColor: 'transparent',
				strokeWidth: 0,
				text: shape.props.richText
					? renderPlaintextFromRichText(editor, shape.props.richText)
					: shape.props.text || '',
				textColor: convertTldrawColorToHex(shape.props.color),
				fontSize: convertTldrawSizeToPixels(shape.props.size) * 4, // Approximate font size
				fontFamily: shape.props.font || 'draw',
				textAlign: convertTldrawTextAlignToOcif(shape.props.textAlign || 'start'),
			}

			// Add the text node data first
			data.push(textNodeData)

			// Add text style extension for rich text support
			data.push({
				type: '@ocif/node/textstyle',
				fontSizePx: convertTldrawSizeToPixels(shape.props.size) * 4,
				fontFamily: convertTldrawFontToCSS(shape.props.font || 'draw'),
				color: convertTldrawColorToHex(shape.props.color),
				align: convertTldrawTextAlignToOcifStyle(shape.props.textAlign || 'start'),
				bold: false, // tldraw doesn't have bold/italic in basic text
				italic: false,
			})

			// Add node transforms extension if shape has scale
			if (shape.props.scale && shape.props.scale !== 1) {
				data.push({
					type: '@ocif/node/transforms',
					scale: shape.props.scale,
					rotation: 0,
					offset: [0, 0],
				})
			}

			break
		}
		case 'draw': {
			// Draw shapes are converted to path nodes
			const pathData = convertDrawSegmentsToSvgPath(shape.props.segments)
			const drawNodeData: any = {
				type: '@ocif/node/path',
				strokeColor: convertTldrawColorToHex(shape.props.color),
				fillColor: shape.props.isClosed
					? convertTldrawFillToHex(shape.props.fill, shape.props.color)
					: 'transparent',
				strokeWidth: convertTldrawSizeToPixels(shape.props.size),
				path: pathData,
				closed: shape.props.isClosed || false,
			}

			// Add the main path data first
			data.push(drawNodeData)

			// Add node transforms extension if shape has scale
			if (shape.props.scale && shape.props.scale !== 1) {
				data.push({
					type: '@ocif/node/transforms',
					scale: shape.props.scale,
					rotation: 0,
					offset: [0, 0],
				})
			}

			break
		}
		case 'arrow':
			data.push({
				type: '@ocif/node/arrow',
				strokeColor: convertTldrawColorToHex(shape.props.color),
				start: [shape.props.start.x, shape.props.start.y],
				end: [shape.props.end.x, shape.props.end.y],
				startMarker: convertTldrawArrowheadToOcif(shape.props.arrowheadStart),
				endMarker: convertTldrawArrowheadToOcif(shape.props.arrowheadEnd),
				strokeWidth: convertTldrawSizeToPixels(shape.props.size),
			})
			break
		case 'frame': {
			// Frame shapes are represented as rectangles with special styling
			data.push({
				type: '@ocif/node/rect',
				strokeColor: convertTldrawColorToHex(shape.props.color || 'black'),
				fillColor: 'transparent',
				strokeWidth: 2,
				// Frame-specific properties
				isFrame: true,
				frameName: shape.props.name || '',
			})
			break
		}
		case 'image': {
			// Images in OCIF are just nodes with resource references (no shape data)
			const node: OcifNode = {
				id: shape.id,
				position,
				size,
				rotation: shape.rotation || 0,
				data: [], // No shape data for pure resource nodes
			}
			if (shape.props.assetId) {
				node.resource = shape.props.assetId
				node.resourceFit = 'contain' // Default fit
			}
			return node
		}
		case 'video': {
			// Videos treated like images - just resource references
			const node: OcifNode = {
				id: shape.id,
				position,
				size,
				rotation: shape.rotation || 0,
				data: [], // No shape data for pure resource nodes
			}
			if (shape.props.assetId) {
				node.resource = shape.props.assetId
				node.resourceFit = 'contain' // Default fit
			}
			return node
		}
		case 'note': {
			// Notes (sticky notes) as custom tldraw extension
			data.push({
				type: '@tldraw/node/note',
				text: shape.props.richText ? renderPlaintextFromRichText(editor, shape.props.richText) : '',
				color: convertTldrawColorToHex(shape.props.color),
				labelColor: convertTldrawColorToHex(shape.props.labelColor || shape.props.color),
				fontSizePx: shape.props.fontSizeAdjustment,
				fontFamily: convertTldrawFontToCSS(shape.props.font || 'draw'),
				align: shape.props.align || 'middle',
				verticalAlign: shape.props.verticalAlign || 'middle',
				growY: shape.props.growY || 0,
				url: shape.props.url || '',
			})
			break
		}
		case 'embed': {
			// Embeds as custom tldraw extension
			data.push({
				type: '@tldraw/node/embed',
				url: shape.props.url || '',
				w: shape.props.w || 100,
				h: shape.props.h || 100,
			})
			break
		}
		case 'bookmark': {
			// Bookmarks as custom tldraw extension
			// Get bookmark details from the asset if available
			let title = ''
			let description = ''
			let favicon = ''
			let image = ''

			if (shape.props.assetId) {
				const asset = editor.getAsset(shape.props.assetId)
				if (asset && asset.type === 'bookmark') {
					title = asset.props.title || ''
					description = asset.props.description || ''
					favicon = asset.props.favicon || ''
					image = asset.props.image || ''
				}
			}

			data.push({
				type: '@tldraw/node/bookmark',
				assetId: shape.props.assetId,
				url: shape.props.url || '',
				title: title,
				description: description,
				favicon: favicon,
				image: image,
			})
			break
		}
		case 'highlight': {
			// Highlights as path nodes with special styling
			const pathData = convertDrawSegmentsToSvgPath(shape.props.segments)
			data.push({
				type: '@tldraw/node/highlight',
				path: pathData,
				color: convertTldrawColorToHex(shape.props.color),
				size: convertTldrawSizeToPixels(shape.props.size),
				isComplete: shape.props.isComplete,
			})
			break
		}
		case 'line': {
			// Lines as enhanced path support - convert points to SVG path
			const points = Object.values(shape.props.points || {}).sort((a: any, b: any) =>
				a.index.localeCompare(b.index)
			)
			let path = ''
			if (points.length >= 2) {
				const firstPoint = points[0] as any
				path = `M${firstPoint.x},${firstPoint.y}`
				for (let i = 1; i < points.length; i++) {
					const point = points[i] as any
					path += ` L${point.x},${point.y}`
				}
			}

			data.push({
				type: '@ocif/node/path',
				strokeColor: convertTldrawColorToHex(shape.props.color),
				fillColor: 'transparent',
				strokeWidth: convertTldrawSizeToPixels(shape.props.size),
				path: path,
				closed: false,
				// Line-specific properties
				spline: shape.props.spline || 'line',
			})

			// Add node transforms extension if shape has scale
			if (shape.props.scale && shape.props.scale !== 1) {
				data.push({
					type: '@ocif/node/transforms',
					scale: shape.props.scale,
					rotation: 0,
					offset: [0, 0],
				})
			}

			break
		}
		case 'group':
			// Groups don't have visual representation in OCIF, they're handled via relations
			return null
		default:
			// For unsupported shapes, create a generic rectangle
			data.push({
				type: '@ocif/node/rect',
				strokeColor: convertTldrawColorToHex('black'),
				fillColor: 'transparent',
				strokeWidth: 1,
			})
			break
	}

	return {
		id: shape.id,
		position,
		size,
		rotation: shape.rotation || 0,
		data,
	}
}

function convertTldrawBindingToOcifRelation(binding: any, editor: Editor): OcifRelation | null {
	if (binding.type === 'arrow') {
		// Get the arrow shape to check if it has ports
		const arrow = editor.getShape(binding.fromId)
		const targetShape = editor.getShape(binding.toId)

		if (!arrow || !targetShape) return null

		// Create basic edge relation
		const relation: OcifRelation = {
			id: binding.id,
			node: binding.fromId,
			data: [
				{
					type: '@ocif/rel/edge',
					start: binding.fromId,
					end: binding.toId,
				},
			],
		}

		// Add ports extension if the binding has precise anchor information
		if (binding.props.isPrecise && binding.props.normalizedAnchor) {
			// Create a virtual port for the precise anchor
			const portId = `port-${binding.toId}-${binding.props.terminal}`
			const targetBounds = editor.getShapeGeometry(targetShape).bounds
			const _portPosition: [number, number] = [
				targetShape.x + targetBounds.minX + binding.props.normalizedAnchor.x * targetBounds.width,
				targetShape.y + targetBounds.minY + binding.props.normalizedAnchor.y * targetBounds.height,
			]

			// Add ports extension to the target shape's data (conceptually)
			relation.data.push({
				type: '@ocif/node/ports',
				ports: [portId],
				terminal: binding.props.terminal,
				normalizedAnchor: binding.props.normalizedAnchor,
			})
		}

		return relation
	}
	return null
}

async function convertTldrawAssetToOcifResource(
	asset: any,
	editor: Editor
): Promise<OcifResource | null> {
	if (asset.type === 'image' || asset.type === 'video') {
		const representations: OcifRepresentation[] = []

		// Always inline the data as base64 for portability (same as TLDR export)
		let assetSrcToSave = asset.props.src
		if (asset.props.src && !asset.props.src.startsWith('data:')) {
			try {
				let src = asset.props.src
				if (!src.startsWith('http')) {
					src = (await editor.resolveAssetUrl(asset.id, { shouldResolveToOriginal: true })) || ''
				}
				// Convert to base64 data URL for portability (same as TLDR export)
				assetSrcToSave = await FileHelpers.blobToDataUrl(await (await fetch(src)).blob())
			} catch {
				// If conversion fails, keep the original src
				assetSrcToSave = asset.props.src
			}
		}

		if (assetSrcToSave) {
			representations.push({
				content: assetSrcToSave, // Always use content (base64) for portability
				mimeType: asset.props.mimeType,
			})
		}

		return {
			id: asset.id,
			representations,
		}
	} else if (asset.type === 'bookmark') {
		const representations: OcifRepresentation[] = []

		// Add the main bookmark URL
		if (asset.props.src) {
			representations.push({
				location: asset.props.src,
				mimeType: 'text/html',
			})
		}

		// Add metadata as JSON representation
		const metadata = {
			title: asset.props.title || '',
			description: asset.props.description || '',
			image: asset.props.image || '',
			favicon: asset.props.favicon || '',
		}

		representations.push({
			content: JSON.stringify(metadata),
			mimeType: 'application/json',
		})

		return {
			id: asset.id,
			representations,
		}
	}

	return null
}

function convertTldrawColorToHex(color: string): string {
	const colorMap: { [key: string]: string } = {
		black: '#000000',
		grey: '#808080',
		white: '#FFFFFF',
		blue: '#0066CC',
		green: '#00AA00',
		yellow: '#FFDD00',
		orange: '#FF8800',
		red: '#FF0000',
		violet: '#8800FF',
		'light-blue': '#66CCFF',
		'light-green': '#88FF88',
		'light-red': '#FF8888',
		'light-violet': '#CC88FF',
	}
	return colorMap[color] || '#000000'
}

function convertTldrawFillToHex(fill: string, color: string): string {
	if (fill === 'none') return 'transparent'
	if (fill === 'solid') return convertTldrawColorToHex(color)
	// For semi-fills, use a transparent version
	const baseColor = convertTldrawColorToHex(color)
	return baseColor + '80' // Add transparency
}

function convertTldrawSizeToPixels(size: string): number {
	const sizeMap: { [key: string]: number } = {
		s: 2,
		m: 4,
		l: 8,
		xl: 12,
	}
	return sizeMap[size] || 2
}

function convertTldrawArrowheadToOcif(arrowhead: string): string {
	const arrowheadMap: { [key: string]: string } = {
		none: 'none',
		arrow: 'arrowhead',
		triangle: 'triangle',
		square: 'square',
		dot: 'dot',
		pipe: 'pipe',
		diamond: 'diamond',
		inverted: 'inverted',
		bar: 'bar',
	}
	return arrowheadMap[arrowhead] || 'none'
}

function convertTldrawFontToCSS(font: string): string {
	const fontMap: { [key: string]: string } = {
		sans: 'sans-serif',
		serif: 'serif',
		mono: 'monospace',
		draw: 'draw',
	}
	return fontMap[font] || 'draw'
}

function convertTldrawTextAlignToOcif(align: string): string {
	const alignMap: { [key: string]: string } = {
		start: 'left',
		middle: 'middle', // Keep as 'middle' for text node textAlign
		end: 'right',
		left: 'left',
		center: 'center',
		right: 'right',
	}
	return alignMap[align] || 'left'
}

function convertTldrawTextAlignToOcifStyle(align: string): string {
	const alignMap: { [key: string]: string } = {
		start: 'left',
		middle: 'center', // Convert to 'center' for text style extension
		end: 'right',
		left: 'left',
		center: 'center',
		right: 'right',
	}
	return alignMap[align] || 'left'
}

function getOcifSchemas(): OcifSchema[] {
	return [
		{
			name: '@ocif/node/rect',
			uri: 'https://spec.canvasprotocol.org/v0.5/core/rect-node.json',
			location: 'https://spec.canvasprotocol.org/v0.5/core/rect-node.json',
			schema: {
				type: 'object',
				properties: {
					type: { const: '@ocif/node/rect' },
					strokeColor: { type: 'string' },
					fillColor: { type: 'string' },
					strokeWidth: { type: 'number' },
					text: { type: 'string' },
					textColor: { type: 'string' },
					fontSize: { type: 'number' },
					fontFamily: { type: 'string' },
					textAlign: { type: 'string' },
				},
			},
		},
		{
			name: '@ocif/node/oval',
			uri: 'https://spec.canvasprotocol.org/v0.5/core/oval-node.json',
			location: 'https://spec.canvasprotocol.org/v0.5/core/oval-node.json',
			schema: {
				type: 'object',
				properties: {
					type: { const: '@ocif/node/oval' },
					strokeColor: { type: 'string' },
					fillColor: { type: 'string' },
					strokeWidth: { type: 'number' },
				},
			},
		},
		{
			name: '@ocif/node/path',
			uri: 'https://spec.canvasprotocol.org/v0.5/core/path-node.json',
			location: 'https://spec.canvasprotocol.org/v0.5/core/path-node.json',
			schema: {
				type: 'object',
				properties: {
					type: { const: '@ocif/node/path' },
					strokeColor: { type: 'string' },
					fillColor: { type: 'string' },
					strokeWidth: { type: 'number' },
					path: { type: 'string' },
					closed: { type: 'boolean' },
				},
			},
		},
		{
			name: '@ocif/node/arrow',
			uri: 'https://spec.canvasprotocol.org/v0.5/core/arrow-node.json',
			location: 'https://spec.canvasprotocol.org/v0.5/core/arrow-node.json',
			schema: {
				type: 'object',
				properties: {
					type: { const: '@ocif/node/arrow' },
					strokeColor: { type: 'string' },
					start: { type: 'array', items: { type: 'number' } },
					end: { type: 'array', items: { type: 'number' } },
					startMarker: { type: 'string' },
					endMarker: { type: 'string' },
					strokeWidth: { type: 'number' },
				},
			},
		},
		{
			name: '@ocif/rel/edge',
			uri: 'https://spec.canvasprotocol.org/v0.5/core/edge-rel.json',
			location: 'https://spec.canvasprotocol.org/v0.5/core/edge-rel.json',
			schema: {
				type: 'object',
				properties: {
					type: { const: '@ocif/rel/edge' },
					start: { type: 'string' },
					end: { type: 'string' },
				},
			},
		},
		{
			name: '@ocif/rel/group',
			uri: 'https://spec.canvasprotocol.org/v0.5/core/group-rel.json',
			location: 'https://spec.canvasprotocol.org/v0.5/core/group-rel.json',
			schema: {
				type: 'object',
				properties: {
					type: { const: '@ocif/rel/group' },
					members: { type: 'array', items: { type: 'string' } },
				},
			},
		},
		// Custom tldraw Extensions
		{
			name: '@tldraw/node/note',
			uri: 'https://tldraw.com/schemas/note-node.json',
			location: 'https://tldraw.com/schemas/note-node.json',
			schema: {
				type: 'object',
				properties: {
					type: { const: '@tldraw/node/note' },
					text: { type: 'string' },
					color: { type: 'string' },
					labelColor: { type: 'string' },
					fontSizePx: { type: 'number' },
					fontFamily: { type: 'string' },
					align: { type: 'string' },
					verticalAlign: { type: 'string' },
					growY: { type: 'number' },
					url: { type: 'string' },
				},
			},
		},
		{
			name: '@tldraw/node/embed',
			uri: 'https://tldraw.com/schemas/embed-node.json',
			location: 'https://tldraw.com/schemas/embed-node.json',
			schema: {
				type: 'object',
				properties: {
					type: { const: '@tldraw/node/embed' },
					url: { type: 'string' },
					w: { type: 'number' },
					h: { type: 'number' },
				},
			},
		},

		{
			name: '@tldraw/node/bookmark',
			uri: 'https://tldraw.com/schemas/bookmark-node.json',
			location: 'https://tldraw.com/schemas/bookmark-node.json',
			schema: {
				type: 'object',
				properties: {
					type: { const: '@tldraw/node/bookmark' },
					assetId: { type: 'string' },
					url: { type: 'string' },
					title: { type: 'string' },
					description: { type: 'string' },
					favicon: { type: 'string' },
					image: { type: 'string' },
				},
			},
		},
		{
			name: '@tldraw/node/highlight',
			uri: 'https://tldraw.com/schemas/highlight-node.json',
			location: 'https://tldraw.com/schemas/highlight-node.json',
			schema: {
				type: 'object',
				properties: {
					type: { const: '@tldraw/node/highlight' },
					path: { type: 'string' },
					color: { type: 'string' },
					size: { type: 'number' },
					isComplete: { type: 'boolean' },
				},
			},
		},
		// OCIF v0.5 Extensions
		{
			name: '@ocif/node/ports',
			uri: 'https://spec.canvasprotocol.org/v0.5/extensions/ports-node.json',
			location: 'https://spec.canvasprotocol.org/v0.5/extensions/ports-node.json',
			schema: {
				type: 'object',
				properties: {
					type: { const: '@ocif/node/ports' },
					ports: { type: 'array', items: { type: 'string' } },
				},
			},
		},
		{
			name: '@ocif/node/transforms',
			uri: 'https://spec.canvasprotocol.org/v0.5/extensions/transforms-node.json',
			location: 'https://spec.canvasprotocol.org/v0.5/extensions/transforms-node.json',
			schema: {
				type: 'object',
				properties: {
					type: { const: '@ocif/node/transforms' },
					scale: { type: ['number', 'array'] },
					rotation: { type: 'number' },
					rotationAxis: { type: 'array', items: { type: 'number' } },
					offset: { type: ['number', 'array'] },
				},
			},
		},
		{
			name: '@ocif/node/textstyle',
			uri: 'https://spec.canvasprotocol.org/v0.5/extensions/textstyle-node.json',
			location: 'https://spec.canvasprotocol.org/v0.5/extensions/textstyle-node.json',
			schema: {
				type: 'object',
				properties: {
					type: { const: '@ocif/node/textstyle' },
					fontSizePx: { type: 'number' },
					fontFamily: { type: 'string' },
					color: { type: 'string' },
					align: { type: 'string', enum: ['left', 'right', 'center', 'justify'] },
					bold: { type: 'boolean' },
					italic: { type: 'boolean' },
				},
			},
		},
		{
			name: '@ocif/rel/parent-child',
			uri: 'https://spec.canvasprotocol.org/v0.5/extensions/parent-child-rel.json',
			location: 'https://spec.canvasprotocol.org/v0.5/extensions/parent-child-rel.json',
			schema: {
				type: 'object',
				properties: {
					type: { const: '@ocif/rel/parent-child' },
					parent: { type: 'string' },
					child: { type: 'string' },
					inherit: { type: 'boolean' },
					cascadeDelete: { type: 'boolean' },
				},
			},
		},
		{
			name: '@ocif/rel/hyperedge',
			uri: 'https://spec.canvasprotocol.org/v0.5/extensions/hyperedge-rel.json',
			location: 'https://spec.canvasprotocol.org/v0.5/extensions/hyperedge-rel.json',
			schema: {
				type: 'object',
				properties: {
					type: { const: '@ocif/rel/hyperedge' },
					endpoints: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								id: { type: 'string' },
								direction: { type: 'string', enum: ['in', 'out', 'undir'] },
								weight: { type: 'number' },
							},
						},
					},
					weight: { type: 'number' },
					rel: { type: 'string' },
				},
			},
		},
	]
}

/** @public */
export function parseOcifFile({
	json,
	schema,
}: {
	schema: TLSchema
	json: string
}): Result<TLStore, OcifFileParseError> {
	let data: OcifFile
	try {
		data = JSON.parse(json)
		if (!data.ocif || !data.nodes) {
			throw new Error('Invalid OCIF structure')
		}
	} catch (e) {
		return Result.err({ type: 'notAnOcifFile', cause: e })
	}

	// Check if OCIF version is supported
	if (!data.ocif.includes('v0.5')) {
		return Result.err({ type: 'ocifVersionNotSupported', version: data.ocif })
	}

	try {
		const records: TLRecord[] = []
		const assetMap = new Map<string, string>()
		const altTextMap = new Map<string, string>() // Store altText for each resource
		const groupRelations = new Map<string, string[]>() // groupId -> memberIds
		const parentChildRelations = new Map<string, string>() // childId -> parentId
		const hyperedgeRelations: any[] = [] // Store hyperedge relations for processing

		// Convert OCIF resources to TLDraw assets
		const resourceTypeMap = new Map<string, string>() // resourceId -> 'image' | 'video' | 'bookmark'
		if (data.resources) {
			for (const resource of data.resources) {
				const assetResult = convertOcifResourceToTldrawAsset(resource)
				if (assetResult) {
					records.push(assetResult.asset)
					assetMap.set(resource.id, assetResult.asset.id)
					resourceTypeMap.set(resource.id, (assetResult.asset as any).type)
					if (assetResult.altText) {
						altTextMap.set(resource.id, assetResult.altText)
					}
				}
			}
		}

		// Collect relations first
		if (data.relations) {
			for (const relation of data.relations) {
				const primaryData = relation.data[0]
				if (!primaryData) continue

				if (primaryData.type === '@ocif/rel/group') {
					groupRelations.set(relation.id, primaryData.members || [])
				} else if (primaryData.type === '@ocif/rel/parent-child') {
					parentChildRelations.set(primaryData.child, primaryData.parent)
				} else if (primaryData.type === '@ocif/rel/hyperedge') {
					hyperedgeRelations.push(relation)
				}
			}
		}

		// Convert OCIF nodes to TLDraw shapes
		for (const node of data.nodes) {
			const shapeRecord = convertOcifNodeToTldrawShape(node, assetMap, altTextMap, resourceTypeMap)
			if (shapeRecord) {
				// Set parent if this node has a parent-child relation
				const parentId = parentChildRelations.get(node.id)
				if (parentId) {
					const parentShapeId = parentId.startsWith('shape:') ? parentId : `shape:${parentId}`
					;(shapeRecord as any).parentId = parentShapeId
				}

				records.push(shapeRecord)
			}
		}

		// Create frame shapes from parent-child relations
		const frameIds = new Set<string>()
		for (const [_childId, parentId] of parentChildRelations) {
			if (!frameIds.has(parentId)) {
				frameIds.add(parentId)

				// Find the parent node to get its properties
				const parentNode = data.nodes.find((n) => n.id === parentId)
				if (parentNode) {
					const frameData = parentNode.data.find((d) => d.isFrame)
					if (frameData) {
						const frameShapeId = parentId.startsWith('shape:') ? parentId : `shape:${parentId}`
						const frameShape = {
							id: frameShapeId,
							typeName: 'shape' as const,
							type: 'frame',
							x: parentNode.position[0],
							y: parentNode.position[1],
							rotation: parentNode.rotation || 0,
							index: 'a1' as any,
							parentId: 'page:page' as any,
							isLocked: false,
							opacity: 1,
							meta: {},
							props: {
								w: parentNode.size?.[0] || 200,
								h: parentNode.size?.[1] || 200,
								name: frameData.frameName || '',
								color: convertHexToTldrawColor(frameData.strokeColor || '#000000'),
							},
						} as any
						records.push(frameShape)
					}
				}
			}
		}

		// Create group shapes and set up parent-child relationships
		for (const [groupId, memberIds] of groupRelations) {
			// Create the group shape
			const groupShapeId = groupId.startsWith('shape:') ? groupId : `shape:${groupId}`

			// Find the bounds of all member shapes
			let minX = Infinity,
				minY = Infinity,
				maxX = -Infinity,
				maxY = -Infinity
			const memberShapes = memberIds
				.map((id) => {
					const shapeId = id.startsWith('shape:') ? id : `shape:${id}`
					return records.find((r) => r.id === shapeId && r.typeName === 'shape') as any
				})
				.filter(Boolean)

			for (const shape of memberShapes) {
				minX = Math.min(minX, shape.x)
				minY = Math.min(minY, shape.y)
				maxX = Math.max(maxX, shape.x + (shape.props.w || 100))
				maxY = Math.max(maxY, shape.y + (shape.props.h || 100))
			}

			if (memberShapes.length > 0) {
				// Create group shape
				const groupShape = {
					id: groupShapeId,
					typeName: 'shape' as const,
					type: 'group',
					x: minX,
					y: minY,
					rotation: 0,
					index: 'a1' as any,
					parentId: 'page:page' as any,
					isLocked: false,
					opacity: 1,
					meta: {},
					props: {},
				} as any
				records.push(groupShape)

				// Update member shapes to have the group as parent
				for (const shape of memberShapes) {
					shape.parentId = groupShapeId
					// Adjust coordinates relative to group
					shape.x -= minX
					shape.y -= minY
				}
			}
		}

		// Process hyperedge relations - create multiple arrow bindings
		for (const hyperedge of hyperedgeRelations) {
			const primaryData = hyperedge.data[0]
			if (primaryData && primaryData.endpoints) {
				const endpoints = primaryData.endpoints

				// Create arrows from 'in' endpoints to 'out' endpoints
				const inEndpoints = endpoints.filter((ep: any) => ep.direction === 'in')
				const outEndpoints = endpoints.filter((ep: any) => ep.direction === 'out')
				const undirEndpoints = endpoints.filter((ep: any) => ep.direction === 'undir')

				// If we have both in and out endpoints, create arrows between them
				if (inEndpoints.length > 0 && outEndpoints.length > 0) {
					for (let i = 0; i < Math.max(inEndpoints.length, outEndpoints.length); i++) {
						const inEndpoint = inEndpoints[i % inEndpoints.length]
						const outEndpoint = outEndpoints[i % outEndpoints.length]

						const bindingRecord = {
							id: `binding:hyperedge-${hyperedge.id}-${i}`,
							typeName: 'binding' as const,
							type: 'arrow',
							fromId: `shape:${inEndpoint.id}`,
							toId: `shape:${outEndpoint.id}`,
							meta: {},
							props: {
								terminal: 'end',
								normalizedAnchor: { x: 0.5, y: 0.5 },
								isExact: false,
								isPrecise: false,
								snap: 'none',
							},
						} as any
						records.push(bindingRecord)
					}
				}

				// Handle undirected endpoints by creating bidirectional connections
				for (let i = 0; i < undirEndpoints.length - 1; i++) {
					const ep1 = undirEndpoints[i]
					const ep2 = undirEndpoints[i + 1]

					const bindingRecord = {
						id: `binding:hyperedge-undir-${hyperedge.id}-${i}`,
						typeName: 'binding' as const,
						type: 'arrow',
						fromId: `shape:${ep1.id}`,
						toId: `shape:${ep2.id}`,
						meta: {},
						props: {
							terminal: 'end',
							normalizedAnchor: { x: 0.5, y: 0.5 },
							isExact: false,
							isPrecise: false,
							snap: 'none',
						},
					} as any
					records.push(bindingRecord)
				}
			}
		}

		// Convert OCIF relations to TLDraw bindings (excluding group and parent-child relations)
		if (data.relations) {
			for (const relation of data.relations) {
				const primaryData = relation.data[0]
				if (
					primaryData &&
					primaryData.type !== '@ocif/rel/group' &&
					primaryData.type !== '@ocif/rel/parent-child' &&
					primaryData.type !== '@ocif/rel/hyperedge'
				) {
					const bindingRecord = convertOcifRelationToTldrawBinding(relation)
					if (bindingRecord) {
						records.push(bindingRecord)
					}
				}
			}
		}

		// Filter out any records that might be invalid or have broken references
		const validRecords = records.filter((record) => {
			// Basic validation - ensure required properties exist
			if (!record.id || !record.typeName) {
				return false
			}

			// For shapes, ensure they have valid properties
			if (record.typeName === 'shape') {
				const shape = record as any
				return shape.type && typeof shape.x === 'number' && typeof shape.y === 'number'
			}

			// For bindings, ensure they reference valid shapes
			if (record.typeName === 'binding') {
				const binding = record as any
				const fromShape = records.find((r) => r.id === binding.fromId && r.typeName === 'shape')
				const toShape = records.find((r) => r.id === binding.toId && r.typeName === 'shape')
				return fromShape && toShape
			}

			// For assets, ensure they have valid properties
			if (record.typeName === 'asset') {
				const asset = record as any
				return asset.type && asset.props
			}

			return true
		})

		// Prune unused assets (same logic as TLDR files)
		const usedAssets = new Set<string>()
		for (const record of validRecords) {
			if (
				record.typeName === 'shape' &&
				'assetId' in (record as any).props &&
				(record as any).props.assetId
			) {
				usedAssets.add((record as any).props.assetId)
			}
		}
		const prunedRecords = validRecords.filter((r) => r.typeName !== 'asset' || usedAssets.has(r.id))

		// Create a store with the validated records
		const storeSnapshot = Object.fromEntries(prunedRecords.map((r) => [r.id, r]))
		return Result.ok(
			createTLStore({
				snapshot: { store: storeSnapshot, schema: schema.serialize() },
				schema,
			})
		)
	} catch (e) {
		return Result.err({ type: 'invalidOcifStructure', cause: e })
	}
}

function convertOcifResourceToTldrawAsset(
	resource: OcifResource
): { asset: TLRecord; altText: string } | null {
	// Create a basic asset from the OCIF resource
	const id = AssetRecordType.createId(resource.id)

	// Extract data and mimeType from either new representations format or legacy format
	let assetData: string | undefined
	let mimeType: string | undefined
	let altText = ''
	let bookmarkMetadata: any = null

	if (resource.representations && resource.representations.length > 0) {
		// Look for the best representation, preferring location over content
		let selectedRep = resource.representations[0]

		// Try to find a location-based representation first
		const locationRep = resource.representations.find((rep) => rep.location)
		if (locationRep) {
			selectedRep = locationRep
		}

		assetData = selectedRep.content || selectedRep.location
		mimeType = selectedRep.mimeType

		// Look for plain text fallback for altText
		const textFallback = resource.representations.find(
			(rep) => rep.mimeType === 'text/plain' && rep.content
		)
		if (textFallback && textFallback.content) {
			altText = textFallback.content
		}

		// Look for bookmark metadata (JSON representation)
		const jsonRep = resource.representations.find(
			(rep) => rep.mimeType === 'application/json' && rep.content
		)
		if (jsonRep && jsonRep.content) {
			try {
				bookmarkMetadata = JSON.parse(jsonRep.content)
			} catch (_e) {
				// Ignore parsing errors
			}
		}
	} else {
		// Fallback to legacy format
		assetData = resource.data
		mimeType = resource.mimeType
	}

	if (!assetData || !mimeType) {
		return null
	}

	if (mimeType.startsWith('image/')) {
		return {
			asset: AssetRecordType.create({
				id,
				type: 'image',
				props: {
					name: `asset-${resource.id}`,
					src: assetData,
					w: 100, // Default dimensions - will be updated when loaded
					h: 100, // Default dimensions - will be updated when loaded
					mimeType: mimeType,
					isAnimated: false,
					fileSize: undefined,
				},
			}),
			altText,
		}
	} else if (mimeType.startsWith('video/')) {
		return {
			asset: AssetRecordType.create({
				id,
				type: 'video',
				props: {
					name: `asset-${resource.id}`,
					src: assetData,
					w: 100, // Default dimensions - will be updated when loaded
					h: 100, // Default dimensions - will be updated when loaded
					mimeType: mimeType,
					isAnimated: true,
					fileSize: undefined,
				},
			}),
			altText,
		}
	} else if (mimeType === 'text/html' && bookmarkMetadata) {
		// This is a bookmark asset
		return {
			asset: AssetRecordType.create({
				id,
				type: 'bookmark',
				props: {
					title: bookmarkMetadata.title || '',
					description: bookmarkMetadata.description || '',
					image: bookmarkMetadata.image || '',
					favicon: bookmarkMetadata.favicon || '',
					src: assetData,
				},
			}),
			altText,
		}
	}

	return null
}

function convertOcifNodeToTldrawShape(
	node: OcifNode,
	assetMap: Map<string, string>,
	altTextMap: Map<string, string>,
	resourceTypeMap: Map<string, string>
): TLRecord | null {
	const [x, y] = node.position
	const [w, h] = node.size || [100, 100]

	// Check for extensions in the data array
	const transformsExtension = node.data.find((d) => d.type === '@ocif/node/transforms')
	const textStyleExtension = node.data.find((d) => d.type === '@ocif/node/textstyle')
	const _portsExtension = node.data.find((d) => d.type === '@ocif/node/ports')

	// Use the node's ID as the shape ID if it's already a proper shape ID format
	const shapeId = node.id.startsWith('shape:') ? node.id : `shape:${node.id}`

	const baseShape = {
		id: shapeId,
		typeName: 'shape' as const,
		x,
		y,
		rotation: node.rotation || 0,
		index: 'a1',
		parentId: 'page:page',
		isLocked: false,
		opacity: 1,
		meta: {},
	}

	// Apply transforms extension if present
	let scale = 1
	if (transformsExtension) {
		scale = Array.isArray(transformsExtension.scale)
			? transformsExtension.scale[0]
			: transformsExtension.scale || 1
	}

	// Handle nodes with empty data arrays (pure resource nodes)
	if (node.data.length === 0 && node.resource) {
		// This is a pure resource node (image/video)
		const assetId = assetMap.get(node.resource)
		const altText = altTextMap.get(node.resource) || ''
		const resourceType = resourceTypeMap.get(node.resource) || 'image'

		if (assetId) {
			if (resourceType === 'video') {
				return {
					...baseShape,
					type: 'video',
					props: {
						assetId: assetId,
						w,
						h,
						time: 0,
						playing: false,
						autoplay: true,
						url: '',
						altText: altText,
					},
				} as any
			} else {
				return {
					...baseShape,
					type: 'image',
					props: {
						assetId: assetId,
						w,
						h,
						playing: true,
						url: '',
						crop: null,
						flipX: false,
						flipY: false,
						altText: altText,
					},
				} as any
			}
		}
		return null
	}

	// Find the primary data type
	const primaryData = node.data[0]
	if (!primaryData) return null

	switch (primaryData.type) {
		case '@ocif/node/rect':
			// Check if this is a text node, image node, or frame
			if (primaryData.text) {
				// This is a text node
				const fontSize = textStyleExtension?.fontSizePx || primaryData.fontSize || 12
				const fontFamily = textStyleExtension?.fontFamily || primaryData.fontFamily || 'draw'
				const textAlign = textStyleExtension?.align || primaryData.textAlign || 'left'
				const color = textStyleExtension?.color || primaryData.textColor || primaryData.strokeColor

				const textProps: any = {
					color: convertHexToTldrawColor(color),
					size: convertPixelsToTldrawSize(fontSize / 4), // Reverse the font size calculation
					font: convertCSSFontToTldraw(fontFamily),
					textAlign: convertOcifTextAlignToTldraw(textAlign),
					w: Math.max(w, 8),
					autoSize: true,
					richText: toRichText(primaryData.text || ''),
					scale: scale,
				}

				return {
					...baseShape,
					type: 'text',
					props: textProps,
				} as any
			} else if (node.resource) {
				// This is an image node
				const assetId = assetMap.get(node.resource)
				const altText = altTextMap.get(node.resource) || ''
				if (assetId) {
					return {
						...baseShape,
						type: 'image',
						props: {
							assetId: assetId,
							w,
							h,
							playing: true,
							url: '',
							crop: null,
							flipX: false,
							flipY: false,
							altText: altText,
						},
					} as any
				}
			} else if (primaryData.isFrame) {
				// This is a frame node - will be handled separately
				return null
			} else {
				// Regular rectangle
				const props: any = {
					geo: 'rectangle',
					color: convertHexToTldrawColor(primaryData.strokeColor),
					fill: convertHexToTldrawFill(primaryData.fillColor),
					size: convertPixelsToTldrawSize(primaryData.strokeWidth),
					w,
					h,
					growY: 0,
					font: 'draw',
					align: 'middle',
					verticalAlign: 'middle',
					url: '',
					dash: 'draw',
					labelColor: 'black',
					richText: toRichText(''),
				}

				// Always add scale property (tldraw schema requires it)
				props.scale = scale

				return {
					...baseShape,
					type: 'geo',
					props,
				} as any
			}

			// Should never get here
			return null

		case '@ocif/node/oval': {
			const props: any = {
				geo: 'ellipse',
				color: convertHexToTldrawColor(primaryData.strokeColor),
				fill: convertHexToTldrawFill(primaryData.fillColor),
				size: convertPixelsToTldrawSize(primaryData.strokeWidth),
				w,
				h,
				growY: 0,
				font: 'draw',
				align: 'middle',
				verticalAlign: 'middle',
				url: '',
				dash: 'draw',
				labelColor: 'black',
				richText: toRichText(''),
			}

			// Always add scale property (tldraw schema requires it)
			props.scale = scale

			return {
				...baseShape,
				type: 'geo',
				props,
			} as any
		}

		case '@ocif/node/path': {
			// Convert path to draw shape
			const segments = convertSvgPathToDrawSegments(primaryData.path || '')
			const props: any = {
				segments,
				color: convertHexToTldrawColor(primaryData.strokeColor),
				fill: convertHexToTldrawFill(primaryData.fillColor),
				dash: 'draw',
				size: convertPixelsToTldrawSize(primaryData.strokeWidth),
				isComplete: true,
				isClosed: primaryData.closed || false,
				isPen: false,
				scale: scale, // Always add scale property (tldraw schema requires it)
			}

			return {
				...baseShape,
				type: 'draw',
				props,
			} as any
		}

		case '@ocif/node/arrow':
			return {
				...baseShape,
				type: 'arrow',
				props: {
					kind: 'arc',
					color: convertHexToTldrawColor(primaryData.strokeColor),
					size: convertPixelsToTldrawSize(primaryData.strokeWidth),
					arrowheadStart: convertOcifArrowheadToTldraw(primaryData.startMarker),
					arrowheadEnd: convertOcifArrowheadToTldraw(primaryData.endMarker),
					start: { x: primaryData.start[0], y: primaryData.start[1] },
					end: { x: primaryData.end[0], y: primaryData.end[1] },
					bend: 0,
					text: '',
					labelPosition: 0.5,
					labelColor: 'black',
					fill: 'none',
					dash: 'draw',
					font: 'draw',
					scale: scale,
					elbowMidPoint: 0,
				},
			} as any

		case '@tldraw/node/image': {
			// Legacy image node support
			const assetId = node.resource ? assetMap.get(node.resource) : null
			const altText = node.resource ? altTextMap.get(node.resource) || '' : ''
			if (assetId) {
				return {
					...baseShape,
					type: 'image',
					props: {
						assetId: assetId,
						w,
						h,
						playing: true,
						url: '',
						crop: primaryData.crop || null,
						flipX: false,
						flipY: false,
						altText: altText,
					},
				} as any
			}
			break
		}

		case '@tldraw/node/note': {
			// Note (sticky note) support
			const props: any = {
				richText: toRichText(primaryData.text || ''),
				color: convertHexToTldrawColor(primaryData.color || '#000000'),
				labelColor: convertHexToTldrawColor(
					primaryData.labelColor || primaryData.color || '#000000'
				),
				size: convertPixelsToTldrawSize((primaryData.fontSizePx || 16) / 4),
				font: convertCSSFontToTldraw(primaryData.fontFamily || 'draw'),
				align: primaryData.align || 'middle',
				verticalAlign: primaryData.verticalAlign || 'middle',
				growY: primaryData.growY || 0,
				url: primaryData.url || '',
				fontSizeAdjustment: primaryData.fontSizePx !== undefined ? primaryData.fontSizePx : 0,
				scale: scale,
			}

			return {
				...baseShape,
				type: 'note',
				props,
			} as any
		}

		case '@tldraw/node/video': {
			// Legacy video node support - now handled like images
			const assetId = node.resource ? assetMap.get(node.resource) : null
			const altText = node.resource ? altTextMap.get(node.resource) || '' : ''
			if (assetId) {
				return {
					...baseShape,
					type: 'video',
					props: {
						assetId: assetId,
						w,
						h,
						time: 0,
						playing: true,
						autoplay: true,
						url: '',
						altText: altText,
					},
				} as any
			}
			break
		}

		case '@tldraw/node/embed': {
			// Embed support
			return {
				...baseShape,
				type: 'embed',
				props: {
					w: primaryData.w || w,
					h: primaryData.h || h,
					url: primaryData.url || '',
				},
			} as any
		}

		case '@tldraw/node/bookmark': {
			// Bookmark support
			const assetId = primaryData.assetId ? assetMap.get(primaryData.assetId) : null
			if (assetId) {
				return {
					...baseShape,
					type: 'bookmark',
					props: {
						w,
						h,
						assetId: assetId,
						url: primaryData.url || '',
					},
				} as any
			}
			break
		}

		case '@tldraw/node/highlight': {
			// Highlight support
			const segments = convertSvgPathToDrawSegments(primaryData.path || '')
			const props: any = {
				segments,
				color: convertHexToTldrawColor(primaryData.color || '#000000'),
				size: convertPixelsToTldrawSize(primaryData.size || 4),
				isComplete: primaryData.isComplete || false,
				isPen: false,
				scale: scale,
			}

			return {
				...baseShape,
				type: 'highlight',
				props,
			} as any
		}

		default:
			// For unknown types, create a basic geo shape
			return {
				...baseShape,
				type: 'geo',
				props: {
					geo: 'rectangle',
					color: 'black',
					fill: 'none',
					size: 'm',
					w,
					h,
					growY: 0,
					font: 'draw',
					align: 'middle',
					verticalAlign: 'middle',
					url: '',
					dash: 'draw',
					labelColor: 'black',
					scale: scale,
					richText: toRichText(''),
				},
			} as any
	}

	return null
}

function convertOcifRelationToTldrawBinding(relation: OcifRelation): TLRecord | null {
	const primaryData = relation.data[0]
	if (!primaryData) return null

	if (primaryData.type === '@ocif/rel/edge') {
		// Ensure binding ID has proper format
		const bindingId = relation.id.startsWith('binding:') ? relation.id : `binding:${relation.id}`

		// Ensure shape IDs have proper format
		const fromId = primaryData.start.startsWith('shape:')
			? primaryData.start
			: `shape:${primaryData.start}`
		const toId = primaryData.end.startsWith('shape:') ? primaryData.end : `shape:${primaryData.end}`

		return {
			id: bindingId,
			typeName: 'binding',
			type: 'arrow',
			fromId,
			toId,
			meta: {},
			props: {
				terminal: 'end',
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isExact: false,
				isPrecise: false,
				snap: 'none',
			},
		} as any
	}

	// Group relations are handled differently - they don't create bindings
	// but rather create group shapes with child relationships
	return null
}

function convertHexToTldrawColor(hex: string): string {
	const colorMap: { [key: string]: string } = {
		'#000000': 'black',
		'#808080': 'grey',
		'#FFFFFF': 'white',
		'#0066CC': 'blue',
		'#00AA00': 'green',
		'#00FF00': 'green',
		'#FFDD00': 'yellow',
		'#FF8800': 'orange',
		'#FF0000': 'red',
		'#8800FF': 'violet',
		'#66CCFF': 'light-blue',
		'#88FF88': 'light-green',
		'#FF8888': 'light-red',
		'#CC88FF': 'light-violet',
	}
	return colorMap[hex] || 'black'
}

function convertHexToTldrawFill(hex: string): string {
	if (hex === 'transparent' || !hex) return 'none'
	if (hex.endsWith('80') || hex.includes('alpha')) return 'semi'
	return 'solid'
}

function convertPixelsToTldrawSize(pixels: number): string {
	if (pixels <= 2) return 's'
	if (pixels <= 4) return 'm'
	if (pixels <= 8) return 'l'
	return 'xl'
}

function convertOcifArrowheadToTldraw(arrowhead: string): string {
	const arrowheadMap: { [key: string]: string } = {
		none: 'none',
		arrowhead: 'arrow',
		triangle: 'triangle',
		square: 'square',
		dot: 'circle',
		pipe: 'line',
		diamond: 'diamond',
		triangle_inverted: 'triangle-open',
	}
	return arrowheadMap[arrowhead] || 'none'
}

function convertCSSFontToTldraw(font: string): string {
	const fontMap: { [key: string]: string } = {
		'sans-serif': 'sans',
		serif: 'serif',
		monospace: 'mono',
	}
	return fontMap[font] || 'draw'
}

function convertOcifTextAlignToTldraw(align: string): string {
	const alignMap: { [key: string]: string } = {
		start: 'start',
		middle: 'middle',
		end: 'end',
		left: 'start',
		center: 'middle',
		right: 'end',
	}
	return alignMap[align] || 'start'
}

function convertDrawSegmentsToSvgPath(segments: any[]): string {
	// Convert tldraw draw segments to SVG path string
	if (!segments || segments.length === 0) return ''

	let path = ''
	for (const segment of segments) {
		if (!segment.points || segment.points.length === 0) continue

		const firstPoint = segment.points[0]
		path += `M${firstPoint.x},${firstPoint.y}`

		for (let i = 1; i < segment.points.length; i++) {
			const point = segment.points[i]
			if (segment.type === 'straight') {
				path += `L${point.x},${point.y}`
			} else {
				// For free-form segments, use line-to for simplicity
				path += `L${point.x},${point.y}`
			}
		}
	}

	return path
}

function convertSvgPathToDrawSegments(path: string): any[] {
	// Convert SVG path string to tldraw draw segments
	if (!path || path.length === 0) {
		return [
			{
				type: 'free',
				points: [
					{ x: 0, y: 0, z: 0.5 },
					{ x: 50, y: 25, z: 0.5 },
					{ x: 100, y: 0, z: 0.5 },
				],
			},
		]
	}

	try {
		// Simple regex-based parsing for basic SVG paths
		const commands = path.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || []
		const segments: any[] = []
		let currentPoints: any[] = []

		for (const command of commands) {
			const type = command[0]
			const coords = command
				.slice(1)
				.trim()
				.split(/[\s,]+/)
				.map(parseFloat)
				.filter((n) => !isNaN(n))

			if (type === 'M' || type === 'm') {
				if (currentPoints.length > 0) {
					segments.push({
						type: 'free',
						points: currentPoints.map((p) => ({ ...p, z: 0.5 })),
					})
					currentPoints = []
				}
				if (coords.length >= 2) {
					currentPoints.push({ x: coords[0], y: coords[1] })
				}
			} else if (type === 'L' || type === 'l') {
				for (let i = 0; i < coords.length; i += 2) {
					if (i + 1 < coords.length) {
						currentPoints.push({ x: coords[i], y: coords[i + 1] })
					}
				}
			}
			// For simplicity, we'll treat all other commands as line segments
			else if (coords.length >= 2) {
				for (let i = 0; i < coords.length; i += 2) {
					if (i + 1 < coords.length) {
						currentPoints.push({ x: coords[i], y: coords[i + 1] })
					}
				}
			}
		}

		if (currentPoints.length > 0) {
			segments.push({
				type: 'free',
				points: currentPoints.map((p) => ({ ...p, z: 0.5 })),
			})
		}

		return segments.length > 0
			? segments
			: [
					{
						type: 'free',
						points: [
							{ x: 0, y: 0, z: 0.5 },
							{ x: 50, y: 25, z: 0.5 },
							{ x: 100, y: 0, z: 0.5 },
						],
					},
				]
	} catch (_error) {
		// Fallback to default segments if parsing fails
		return [
			{
				type: 'free',
				points: [
					{ x: 0, y: 0, z: 0.5 },
					{ x: 50, y: 25, z: 0.5 },
					{ x: 100, y: 0, z: 0.5 },
				],
			},
		]
	}
}

/** @public */
export async function serializeTldrawToOcifBlob(editor: Editor): Promise<Blob> {
	return new Blob([await serializeTldrawToOcif(editor)], { type: OCIF_FILE_MIMETYPE })
}

/** @internal */
export async function parseAndLoadOcifFile(
	editor: Editor,
	document: string,
	msg: (id: any) => string,
	addToast: any,
	forceDarkMode?: boolean
) {
	const parseFileResult = parseOcifFile({
		schema: editor.store.schema,
		json: document,
	})
	if (!parseFileResult.ok) {
		let description
		switch (parseFileResult.error.type) {
			case 'notAnOcifFile':
				editor.annotateError(parseFileResult.error.cause, {
					origin: 'file-system.open.parse',
					willCrashApp: false,
					tags: { parseErrorType: parseFileResult.error.type },
				})
				description = msg('file-system.file-open-error.not-a-tldraw-file') // Reuse same message
				break
			case 'ocifVersionNotSupported':
				description = msg('file-system.file-open-error.file-format-version-too-new')
				break
			case 'invalidOcifStructure':
				editor.annotateError(parseFileResult.error.cause, {
					origin: 'file-system.open.parse',
					willCrashApp: false,
					tags: { parseErrorType: parseFileResult.error.type },
				})
				description = msg('file-system.file-open-error.generic-corrupted-file')
				break
			default:
				description = msg('file-system.file-open-error.generic-corrupted-file')
				break
		}
		addToast({
			title: msg('file-system.file-open-error.title'),
			description,
			severity: 'error',
		})

		return
	}

	// Import the OCIF data into the editor
	transact(() => {
		const snapshot = parseFileResult.value.getStoreSnapshot()
		editor.loadSnapshot(snapshot)
		editor.clearHistory()

		// Extract assets similar to parseAndLoadDocument
		extractAssets(editor, snapshot, msg, addToast)

		const bounds = editor.getCurrentPageBounds()
		if (bounds) {
			editor.zoomToBounds(bounds, { targetZoom: 1, immediate: true })
		}
	})

	if (forceDarkMode) editor.user.updateUserPreferences({ colorScheme: 'dark' })
}

// Import the consolidated asset extraction function from file.ts
import { extractAssets } from '../tldr/file'
