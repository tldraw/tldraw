import { TLImageShape, createTLSchema } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { StoredImage, planMcpImage, readImageInfo } from './mcpImage'
import { gifBytes, jpegBytes, pngBytes, webpBytes } from './mcpImageTestHelpers'

describe('readImageInfo', () => {
	it('reads the type and size from the header of each supported format', () => {
		expect(readImageInfo(pngBytes(800, 600))).toEqual({
			mimeType: 'image/png',
			w: 800,
			h: 600,
			isAnimated: false,
		})
		expect(readImageInfo(gifBytes(320, 240))).toEqual({
			mimeType: 'image/gif',
			w: 320,
			h: 240,
			isAnimated: true,
		})
		expect(readImageInfo(webpBytes(1024, 768))).toEqual({
			mimeType: 'image/webp',
			w: 1024,
			h: 768,
			isAnimated: false,
		})
		expect(readImageInfo(webpBytes(64, 64, { animated: true }))?.isAnimated).toBe(true)
		expect(readImageInfo(jpegBytes(4000, 3000))).toEqual({
			mimeType: 'image/jpeg',
			w: 4000,
			h: 3000,
			isAnimated: false,
		})
	})

	// A phone photo is stored landscape with a rotation tag, and browsers draw it turned. Without
	// this the shape would be the wrong way round and the image stretched to fit it.
	it('gives a rotated JPEG the size it is drawn at', () => {
		expect(readImageInfo(jpegBytes(4000, 3000, 6))).toMatchObject({ w: 3000, h: 4000 })
		expect(readImageInfo(jpegBytes(4000, 3000, 1))).toMatchObject({ w: 4000, h: 3000 })
	})

	it('refuses anything else, including an image cut off before its size', () => {
		const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>')
		for (const bytes of [
			new Uint8Array(),
			svg,
			pngBytes(10, 10).subarray(0, 12),
			pngBytes(0, 10),
		]) {
			expect(readImageInfo(bytes)).toBeNull()
		}
	})
})

const IMAGE: StoredImage = {
	objectName: 'abc-shot-png',
	src: 'https://content.example/abc-shot-png',
	name: 'shot.png',
	fileSize: 1234,
	info: { mimeType: 'image/png', w: 2000, h: 1000, isAnimated: false },
}

const PAGE_ONE = { id: 'page:one', typeName: 'page', name: 'First', index: 'a1', meta: {} }
const PAGE_TWO = { id: 'page:two', typeName: 'page', name: 'Second', index: 'a2', meta: {} }

function box(id: string, parentId: string, index: string, x: number, y: number, w: number) {
	return {
		id: `shape:${id}`,
		typeName: 'shape',
		type: 'geo',
		parentId,
		index,
		x,
		y,
		props: { w, h: 100 },
	}
}

function plan(records: any[], overrides: Partial<Parameters<typeof planMcpImage>[0]> = {}) {
	return planMcpImage({
		records,
		fileId: 'board_1',
		userId: 'user_1',
		image: IMAGE,
		pageId: null,
		position: null,
		w: null,
		altText: null,
		now: Date.UTC(2026, 0, 1),
		...overrides,
	})
}

describe('planMcpImage', () => {
	it('writes an asset and a shape the board’s schema accepts', () => {
		const planned = plan([PAGE_TWO, PAGE_ONE], { altText: 'A chart' })
		if (!planned.ok) throw new Error('Expected a plan')
		const [asset, shape] = planned.records
		const schema = createTLSchema()
		expect(schema.types.asset.validate(asset)).toEqual(asset)
		expect(schema.types.shape.validate(shape)).toEqual(shape)

		expect(asset).toMatchObject({
			type: 'image',
			props: { src: IMAGE.src, w: 2000, h: 1000, mimeType: 'image/png', name: 'shot.png' },
			meta: { fileId: 'board_1' },
		})
		// The first page by index, at the natural size capped to the default width.
		expect(shape).toMatchObject({
			type: 'image',
			parentId: 'page:one',
			x: 0,
			y: 0,
			props: { w: 1000, h: 500, assetId: asset.id, altText: 'A chart' },
			meta: { agent: { userId: 'user_1', at: '2026-01-01T00:00:00.000Z' } },
		})
		expect(planned).toMatchObject({
			pageId: 'page:one',
			pageName: 'First',
			x: 0,
			y: 0,
			w: 1000,
			h: 500,
		})
	})

	it('lands beside the page’s content and above it, unless told where', () => {
		const records = [
			PAGE_ONE,
			PAGE_TWO,
			box('a', 'page:one', 'a1', 100, 50, 200),
			box('b', 'page:one', 'a5', 400, 20, 300),
			box('elsewhere', 'page:two', 'a9', 5000, 5000, 100),
		]
		const beside = plan(records)
		if (!beside.ok) throw new Error('Expected a plan')
		expect(beside).toMatchObject({ x: 780, y: 20 })
		const shape = beside.records[1] as TLImageShape
		expect(shape.index > 'a5').toBe(true)
		expect(shape.index < 'a9').toBe(true)

		expect(plan(records, { position: { x: -10, y: 7 }, w: 400 })).toMatchObject({
			x: -10,
			y: 7,
			w: 400,
			h: 200,
		})
	})

	it('goes on the page that was named, and refuses one that is not there', () => {
		expect(plan([PAGE_ONE, PAGE_TWO], { pageId: 'page:two' })).toMatchObject({
			pageId: 'page:two',
			pageName: 'Second',
		})
		expect(plan([PAGE_ONE], { pageId: 'page:gone' })).toEqual({
			ok: false,
			reason: 'page_not_found',
			pageId: 'page:gone',
		})
		expect(plan([])).toEqual({ ok: false, reason: 'board_empty' })
	})

	// What makes a retry safe: an agent that never saw the first answer calls again with the same
	// uploadId and must not leave two copies.
	it('returns the image already placed when the same upload is added again', () => {
		const first = plan([PAGE_ONE], { position: { x: 30, y: 40 } })
		if (!first.ok) throw new Error('Expected a plan')
		const again = plan([PAGE_ONE, ...first.records], { position: { x: 900, y: 900 }, w: 50 })
		expect(again).toEqual({ ...first, records: [] })
	})
})
