import {
	Editor,
	FileHelpers,
	Result,
	TLAssetId,
	TLRecord,
	TLSchema,
	TLStore,
	createTLStore,
	fetch,
} from '@tldraw/editor'

/** @public */
export const OCIF_FILE_MIMETYPE = 'application/vnd.ocif+json' as const

/** @public */
export const OCIF_FILE_EXTENSION = '.ocif' as const

/** @public */
export interface OcifNode {
	id: string
	position: [number, number]
	size?: [number, number]
	resource?: string
	data: Array<{
		type: string
		[key: string]: any
	}>
}

/** @public */
export interface OcifRelation {
	id: string
	data: Array<{
		type: string
		[key: string]: any
	}>
}

/** @public */
export interface OcifResource {
	id: string
	data: string
	mimeType: string
}

/** @public */
export interface OcifSchema {
	name: string
	uri: string
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
	const records: TLRecord[] = []
	const resources: OcifResource[] = []
	const nodes: OcifNode[] = []
	const relations: OcifRelation[] = []

	// First, collect all records and process assets
	for (const record of editor.store.allRecords()) {
		switch (record.typeName) {
			case 'asset':
				if (
					record.type !== 'bookmark' &&
					record.props.src &&
					!record.props.src.startsWith('data:')
				) {
					let assetSrcToSave
					try {
						let src = record.props.src
						if (!src.startsWith('http')) {
							src =
								(await editor.resolveAssetUrl(record.id, { shouldResolveToOriginal: true })) || ''
						}
						// try to save the asset as a base64 string
						assetSrcToSave = await FileHelpers.blobToDataUrl(await (await fetch(src)).blob())
					} catch {
						// if that fails, just save the original src
						assetSrcToSave = record.props.src
					}

					resources.push({
						id: record.id,
						data: assetSrcToSave,
						mimeType: (record as any).props.mimeType || 'application/octet-stream',
					})
				} else if (record.props.src && record.props.src.startsWith('data:')) {
					resources.push({
						id: record.id,
						data: record.props.src,
						mimeType: (record as any).props.mimeType || 'application/octet-stream',
					})
				}
				break
			case 'shape': {
				const node = convertTldrawShapeToOcifNode(record as any)
				if (node) {
					nodes.push(node)
				}
				break
			}
			case 'binding': {
				const relation = convertTldrawBindingToOcifRelation(record as any)
				if (relation) {
					relations.push(relation)
				}
				break
			}
			default:
				records.push(record)
				break
		}
	}

	const ocifFile: OcifFile = {
		ocif: 'https://canvasprotocol.org/ocif/v0.5',
		nodes,
		relations: relations.length > 0 ? relations : undefined,
		resources: resources.length > 0 ? resources : undefined,
		schemas: getOcifSchemas(),
	}

	return JSON.stringify(ocifFile, null, 2)
}

function convertTldrawShapeToOcifNode(shape: any): OcifNode | null {
	const position: [number, number] = [shape.x, shape.y]
	const size: [number, number] = [
		shape.props.w || shape.props.size || 100,
		shape.props.h || shape.props.size || 100,
	]

	const data: Array<{ type: string; [key: string]: any }> = []

	switch (shape.type) {
		case 'geo':
			if (shape.props.geo === 'rectangle') {
				data.push({
					type: '@ocif/node/rect',
					strokeColor: convertTldrawColorToHex(shape.props.color),
					fillColor: convertTldrawFillToHex(shape.props.fill, shape.props.color),
					strokeWidth: convertTldrawSizeToPixels(shape.props.size),
				})
			} else if (shape.props.geo === 'ellipse' || shape.props.geo === 'oval') {
				data.push({
					type: '@ocif/node/oval',
					strokeColor: convertTldrawColorToHex(shape.props.color),
					fillColor: convertTldrawFillToHex(shape.props.fill, shape.props.color),
					strokeWidth: convertTldrawSizeToPixels(shape.props.size),
				})
			} else {
				// For other geo shapes, use rectangle as fallback
				data.push({
					type: '@ocif/node/rect',
					strokeColor: convertTldrawColorToHex(shape.props.color),
					fillColor: convertTldrawFillToHex(shape.props.fill, shape.props.color),
					strokeWidth: convertTldrawSizeToPixels(shape.props.size),
				})
			}
			break
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
		case 'image': {
			const node: OcifNode = {
				id: shape.id,
				position,
				size,
				data: [
					{
						type: '@tldraw/node/image',
						crop: shape.props.crop,
					},
				],
			}
			if (shape.props.assetId) {
				node.resource = shape.props.assetId
			}
			return node
		}
		default:
			// For unsupported shapes, create a generic node
			data.push({
				type: `@tldraw/node/${shape.type}`,
				...shape.props,
			})
			break
	}

	return {
		id: shape.id,
		position,
		size,
		data,
	}
}

function convertTldrawBindingToOcifRelation(binding: any): OcifRelation | null {
	if (binding.type === 'arrow') {
		return {
			id: binding.id,
			data: [
				{
					type: '@ocif/rel/edge',
					start: binding.fromId,
					end: binding.toId,
				},
			],
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

function getOcifSchemas(): OcifSchema[] {
	return [
		{
			name: '@ocif/node/rect',
			uri: 'https://spec.canvasprotocol.org/v0.5/core/rect-node.json',
		},
		{
			name: '@ocif/node/oval',
			uri: 'https://spec.canvasprotocol.org/v0.5/core/oval-node.json',
		},
		{
			name: '@ocif/node/arrow',
			uri: 'https://spec.canvasprotocol.org/v0.5/core/arrow-node.json',
		},
		{
			name: '@ocif/rel/edge',
			uri: 'https://spec.canvasprotocol.org/v0.5/core/edge-rel.json',
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

		// Convert OCIF resources to TLDraw assets
		if (data.resources) {
			for (const resource of data.resources) {
				const assetRecord = convertOcifResourceToTldrawAsset(resource)
				if (assetRecord) {
					records.push(assetRecord)
					assetMap.set(resource.id, assetRecord.id)
				}
			}
		}

		// Convert OCIF nodes to TLDraw shapes
		for (const node of data.nodes) {
			const shapeRecord = convertOcifNodeToTldrawShape(node, assetMap)
			if (shapeRecord) {
				records.push(shapeRecord)
			}
		}

		// Convert OCIF relations to TLDraw bindings
		if (data.relations) {
			for (const relation of data.relations) {
				const bindingRecord = convertOcifRelationToTldrawBinding(relation)
				if (bindingRecord) {
					records.push(bindingRecord)
				}
			}
		}

		// Create a store with the converted records
		const storeSnapshot = Object.fromEntries(records.map((r) => [r.id, r]))
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

function convertOcifResourceToTldrawAsset(resource: OcifResource): TLRecord | null {
	// Create a basic asset from the OCIF resource
	const id = resource.id as TLAssetId
	
	if (resource.mimeType.startsWith('image/')) {
		return {
			id,
			typeName: 'asset',
			type: 'image',
			meta: {},
			props: {
				name: `asset-${id}`,
				src: resource.data,
				w: 0, // Will be determined when loaded
				h: 0, // Will be determined when loaded
				mimeType: resource.mimeType,
				isAnimated: false,
			},
		} as any
	} else if (resource.mimeType.startsWith('video/')) {
		return {
			id,
			typeName: 'asset',
			type: 'video',
			meta: {},
			props: {
				name: `asset-${id}`,
				src: resource.data,
				w: 0, // Will be determined when loaded
				h: 0, // Will be determined when loaded
				mimeType: resource.mimeType,
				isAnimated: false,
			},
		} as any
	}

	return null
}

function convertOcifNodeToTldrawShape(node: OcifNode, assetMap: Map<string, string>): TLRecord | null {
	const [x, y] = node.position
	const [w, h] = node.size || [100, 100]

	// Find the primary data type
	const primaryData = node.data[0]
	if (!primaryData) return null

	const baseShape = {
		id: node.id,
		typeName: 'shape' as const,
		x,
		y,
		rotation: 0,
		index: 'a1' as any,
		parentId: 'page:page' as any,
		isLocked: false,
		opacity: 1,
		meta: {},
	}

	switch (primaryData.type) {
		case '@ocif/node/rect':
			return {
				...baseShape,
				type: 'geo',
				props: {
					geo: 'rectangle',
					color: convertHexToTldrawColor(primaryData.strokeColor),
					fill: convertHexToTldrawFill(primaryData.fillColor),
					size: convertPixelsToTldrawSize(primaryData.strokeWidth),
					w,
					h,
					growY: 0,
					text: '',
					font: 'draw',
					align: 'middle',
					verticalAlign: 'middle',
					url: '',
					dash: 'draw',
					labelColor: 'black',
					scale: 1,
					richText: null,
				},
			} as any

		case '@ocif/node/oval':
			return {
				...baseShape,
				type: 'geo',
				props: {
					geo: 'ellipse',
					color: convertHexToTldrawColor(primaryData.strokeColor),
					fill: convertHexToTldrawFill(primaryData.fillColor),
					size: convertPixelsToTldrawSize(primaryData.strokeWidth),
					w,
					h,
					growY: 0,
					text: '',
					font: 'draw',
					align: 'middle',
					verticalAlign: 'middle',
					url: '',
					dash: 'draw',
					labelColor: 'black',
					scale: 1,
					richText: null,
				},
			} as any

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
					scale: 1,
					elbowMidPoint: 0,
				},
			} as any

		case '@tldraw/node/image': {
			const assetId = node.resource ? assetMap.get(node.resource) : null
			return {
				...baseShape,
				type: 'image',
				props: {
					assetId: assetId || null,
					w,
					h,
					playing: true,
					url: '',
					crop: primaryData.crop || null,
				},
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
					text: '',
					font: 'draw',
					align: 'middle',
					verticalAlign: 'middle',
					url: '',
					dash: 'draw',
					labelColor: 'black',
					scale: 1,
					richText: null,
				},
			} as any
	}
}

function convertOcifRelationToTldrawBinding(relation: OcifRelation): TLRecord | null {
	const primaryData = relation.data[0]
	if (!primaryData) return null

	if (primaryData.type === '@ocif/rel/edge') {
		return {
			id: relation.id,
			typeName: 'binding',
			type: 'arrow',
			fromId: primaryData.start,
			toId: primaryData.end,
			meta: {},
			props: {
				terminal: 'end',
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isExact: false,
				isPrecise: false,
			},
		} as any
	}

	return null
}

function convertHexToTldrawColor(hex: string): string {
	const colorMap: { [key: string]: string } = {
		'#000000': 'black',
		'#808080': 'grey',
		'#FFFFFF': 'white',
		'#0066CC': 'blue',
		'#00AA00': 'green',
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
		dot: 'dot',
		pipe: 'pipe',
		diamond: 'diamond',
		inverted: 'inverted',
		bar: 'bar',
	}
	return arrowheadMap[arrowhead] || 'none'
}

/** @public */
export async function serializeTldrawToOcifBlob(editor: Editor): Promise<Blob> {
	return new Blob([await serializeTldrawToOcif(editor)], { type: OCIF_FILE_MIMETYPE })
} 