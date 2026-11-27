import { UnknownRecord } from '@tldraw/store'
import {
	AssetRecordType,
	TLAssetId,
	TLImageAsset,
	TLImageShape,
	TLPage,
	TLPageId,
	TLShape,
	createShapeId,
	isPage,
	isShape,
} from '@tldraw/tlschema'
import { IndexKey, getIndexAbove, uniqueId } from '@tldraw/utils'
import {
	AddImageRefusal,
	IMAGE_DEFAULT_MAX_WIDTH,
	ImageUploadMimeType,
	getPageTransformResolver,
} from './routes/tla/boardTools'

// --- Reading an image's header ------------------------------------------------------------------

export interface ImageInfo {
	mimeType: ImageUploadMimeType
	/** As a browser draws it: a JPEG's EXIF rotation is already applied. */
	w: number
	h: number
	isAnimated: boolean
}

/**
 * What kind of image these bytes are and how large it is, from the header alone, or null for
 * anything else. The type comes from the bytes, never from a header the uploader wrote, and the
 * size has to be read here: an image shape needs one, and no browser is involved to load the image.
 */
export function readImageInfo(bytes: Uint8Array): ImageInfo | null {
	try {
		const info = readPng(bytes) ?? readGif(bytes) ?? readWebp(bytes) ?? readJpeg(bytes)
		if (!info || !(info.w > 0) || !(info.h > 0)) return null
		return info
	} catch {
		// A file cut off mid-header reads past its end.
		return null
	}
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
	return String.fromCharCode(...bytes.subarray(offset, offset + length))
}

function view(bytes: Uint8Array) {
	return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function readPng(bytes: Uint8Array): ImageInfo | null {
	if (bytes.length < 24 || !PNG_SIGNATURE.every((byte, i) => bytes[i] === byte)) return null
	if (ascii(bytes, 12, 4) !== 'IHDR') return null
	const data = view(bytes)
	return { mimeType: 'image/png', w: data.getUint32(16), h: data.getUint32(20), isAnimated: false }
}

function readGif(bytes: Uint8Array): ImageInfo | null {
	if (bytes.length < 10) return null
	const signature = ascii(bytes, 0, 6)
	if (signature !== 'GIF87a' && signature !== 'GIF89a') return null
	const data = view(bytes)
	// Counting frames means walking the whole file. Calling a still GIF animated only costs it a
	// play button.
	return {
		mimeType: 'image/gif',
		w: data.getUint16(6, true),
		h: data.getUint16(8, true),
		isAnimated: true,
	}
}

function readWebp(bytes: Uint8Array): ImageInfo | null {
	if (bytes.length < 30 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') {
		return null
	}
	const data = view(bytes)
	switch (ascii(bytes, 12, 4)) {
		case 'VP8 ':
			return {
				mimeType: 'image/webp',
				w: data.getUint16(26, true) & 0x3fff,
				h: data.getUint16(28, true) & 0x3fff,
				isAnimated: false,
			}
		case 'VP8L': {
			if (bytes[20] !== 0x2f) return null
			const bits = data.getUint32(21, true)
			return {
				mimeType: 'image/webp',
				w: (bits & 0x3fff) + 1,
				h: ((bits >>> 14) & 0x3fff) + 1,
				isAnimated: false,
			}
		}
		case 'VP8X':
			return {
				mimeType: 'image/webp',
				w: (data.getUint16(24, true) | (bytes[26] << 16)) + 1,
				h: (data.getUint16(27, true) | (bytes[29] << 16)) + 1,
				isAnimated: (bytes[20] & 0x02) !== 0,
			}
		default:
			return null
	}
}

function readJpeg(bytes: Uint8Array): ImageInfo | null {
	if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
	const data = view(bytes)
	let orientation = 1
	let offset = 2
	while (offset + 4 <= bytes.length) {
		if (bytes[offset] !== 0xff) return null
		const marker = bytes[offset + 1]
		// Fill bytes before a marker.
		if (marker === 0xff) {
			offset++
			continue
		}
		const length = data.getUint16(offset + 2)
		if (marker === 0xe1) {
			orientation = readExifOrientation(bytes, offset + 4, length - 2) ?? orientation
		}
		// The start-of-frame markers, which carry the size. C4, C8 and CC share the range but are tables.
		const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)
		if (isFrame) {
			if (offset + 9 > bytes.length) return null
			const h = data.getUint16(offset + 5)
			const w = data.getUint16(offset + 7)
			// Orientations 5 to 8 are quarter turns, which browsers apply when drawing.
			const turned = orientation >= 5 && orientation <= 8
			return { mimeType: 'image/jpeg', w: turned ? h : w, h: turned ? w : h, isAnimated: false }
		}
		offset += 2 + length
	}
	return null
}

function readExifOrientation(bytes: Uint8Array, start: number, length: number): number | null {
	if (length < 14 || start + length > bytes.length || ascii(bytes, start, 4) !== 'Exif') {
		return null
	}
	const tiff = start + 6
	const data = view(bytes)
	const littleEndian = ascii(bytes, tiff, 2) === 'II'
	const end = start + length
	const directory = tiff + data.getUint32(tiff + 4, littleEndian)
	if (directory + 2 > end) return null
	const entries = data.getUint16(directory, littleEndian)
	for (let i = 0; i < entries; i++) {
		const entry = directory + 2 + i * 12
		if (entry + 12 > end) return null
		if (data.getUint16(entry, littleEndian) === 0x0112) {
			return data.getUint16(entry + 8, littleEndian)
		}
	}
	return null
}

// --- Planning the write -------------------------------------------------------------------------

/** An image already in the uploads bucket, and what was read from it when it was stored. */
export interface StoredImage {
	objectName: string
	src: string
	name: string
	fileSize: number
	info: ImageInfo
}

export type PlannedMcpImage =
	| {
			ok: true
			/** Empty when the image is already on the board; the asset first otherwise. */
			records: Array<TLImageAsset | TLImageShape>
			shapeId: string
			pageId: string
			pageName: string
			x: number
			y: number
			w: number
			h: number
	  }
	| ({ ok: false } & AddImageRefusal)

// How far from the page's existing content an image lands when the caller names no position.
const PLACEMENT_GAP = 80

interface PageContent {
	topIndex: IndexKey | null
	minY: number
	maxX: number
}

/**
 * The records that put a stored image on a page, checked against the room as it is now.
 *
 * Ids derive from the object name, so a repeated call for the same upload finds the shape it made
 * the first time and returns it instead of adding a second.
 *
 * Reads every record once. A storage transaction has no index by parent, and both the top of the
 * page's stacking order and where its content ends depend on every shape on it.
 */
export function planMcpImage({
	records,
	fileId,
	userId,
	image,
	pageId,
	position,
	w,
	altText,
	now,
}: {
	records: Iterable<UnknownRecord>
	fileId: string
	userId: string
	image: StoredImage
	/** Null for the first page. */
	pageId: string | null
	/** Null to place beside the page's existing content. */
	position: { x: number; y: number } | null
	/** Null for the natural width, up to IMAGE_DEFAULT_MAX_WIDTH. */
	w: number | null
	altText: string | null
	now: number
}): PlannedMcpImage {
	const shapeId = createShapeId(`mcp-${image.objectName}`)
	const pages: TLPage[] = []
	const shapes: TLShape[] = []
	const contentByPage = new Map<string, PageContent>()
	let existing: TLShape | null = null

	for (const record of records) {
		if (isPage(record)) {
			pages.push(record)
		} else if (isShape(record)) {
			shapes.push(record)
			if (record.id === shapeId) existing = record
			const content = contentByPage.get(record.parentId) ?? {
				topIndex: null,
				minY: Infinity,
				maxX: -Infinity,
			}
			if (!content.topIndex || record.index > content.topIndex) content.topIndex = record.index
			// An estimate: rotation is ignored, and a shape with no width (a line, a drawing) counts as
			// its origin. Enough to land clear of most boards; a caller that cares passes x and y.
			const width = (record.props as { w?: unknown }).w
			content.minY = Math.min(content.minY, record.y)
			content.maxX = Math.max(content.maxX, record.x + (typeof width === 'number' ? width : 0))
			contentByPage.set(record.parentId, content)
		}
	}

	if (pages.length === 0) return { ok: false, reason: 'board_empty' }
	pages.sort((a, b) => (a.index < b.index ? -1 : a.index > b.index ? 1 : 0))

	if (existing && existing.type === 'image') {
		const placed = existing as TLImageShape
		// Not the shape's own parentId, x and y: grouped or framed since, those are relative to a shape.
		const onPage = getPageTransformResolver(shapes)(placed)
		const page = pages.find((candidate) => candidate.id === onPage.pageId)
		return {
			ok: true,
			records: [],
			shapeId,
			pageId: onPage.pageId,
			pageName: page?.name ?? '',
			x: onPage.x,
			y: onPage.y,
			w: placed.props.w,
			h: placed.props.h,
		}
	}

	const page = pageId ? pages.find((candidate) => candidate.id === pageId) : pages[0]
	if (!page) return { ok: false, reason: 'page_not_found', pageId: pageId! }

	const content = contentByPage.get(page.id)
	const width = w ?? Math.min(image.info.w, IMAGE_DEFAULT_MAX_WIDTH)
	const height = Math.max(1, Math.round((width * image.info.h) / image.info.w))
	const { x, y } =
		position ?? (content ? { x: content.maxX + PLACEMENT_GAP, y: content.minY } : { x: 0, y: 0 })

	const assetId = AssetRecordType.createId(`mcp-${image.objectName}`) as TLAssetId
	const asset: TLImageAsset = {
		id: assetId,
		typeName: 'asset',
		type: 'image',
		props: {
			w: image.info.w,
			h: image.info.h,
			name: image.name,
			isAnimated: image.info.isAnimated,
			mimeType: image.info.mimeType,
			src: image.src,
			fileSize: image.fileSize,
		},
		// What the association pass reads to tell this board's own uploads from pasted-in ones.
		meta: { fileId },
	}
	const shape: TLImageShape = {
		id: shapeId,
		typeName: 'shape',
		type: 'image',
		x,
		y,
		rotation: 0,
		index: getIndexAbove(content?.topIndex ?? undefined),
		parentId: page.id as TLPageId,
		isLocked: false,
		opacity: 1,
		props: {
			w: width,
			h: height,
			playing: true,
			url: '',
			assetId,
			crop: null,
			flipX: false,
			flipY: false,
			altText: altText ?? '',
		},
		// The stamp apply_ops puts on a shape an agent made (AgentShapeMeta in the client's canvas-ops).
		meta: { agent: { batchId: uniqueId(), userId, at: new Date(now).toISOString() } },
	}

	return {
		ok: true,
		records: [asset, shape],
		shapeId,
		pageId: page.id,
		pageName: page.name,
		x,
		y,
		w: width,
		h: height,
	}
}
