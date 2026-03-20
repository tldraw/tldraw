import { TLEmbedShape } from '@tldraw/editor'
import { defaultHandleExternalEmbedContent } from '../lib/defaultExternalContentHandlers'
import { extractIframeFromHtml } from '../lib/ui/hooks/useClipboardEvents'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
})

afterEach(() => {
	editor?.dispose()
})

describe('extractIframeFromHtml', () => {
	it('extracts iframe with width and height attributes', () => {
		const result = extractIframeFromHtml(
			'<iframe width="425" height="350" src="https://www.openstreetmap.org/export/embed.html?bbox=-0.1258" style="border: 1px solid black"></iframe>'
		)
		expect(result).toEqual({
			src: 'https://www.openstreetmap.org/export/embed.html?bbox=-0.1258',
			width: 425,
			height: 350,
		})
	})

	it('extracts iframe with surrounding HTML content', () => {
		const result = extractIframeFromHtml(
			'<iframe width="425" height="350" src="https://www.openstreetmap.org/export/embed.html"></iframe><br/><small><a href="https://www.openstreetmap.org">View Larger Map</a></small>'
		)
		expect(result).not.toBeNull()
		expect(result!.src).toBe('https://www.openstreetmap.org/export/embed.html')
		expect(result!.width).toBe(425)
		expect(result!.height).toBe(350)
	})

	it('extracts iframe with style-only dimensions (percentage-based falls back to defaults)', () => {
		const result = extractIframeFromHtml(
			'<iframe src="https://w.soundcloud.com/player/?visual=true&url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F2184622839&show_artwork=true" style="top: 0; left: 0; width: 100%; height: 100%; position: absolute; border: 0;" allowfullscreen></iframe>'
		)
		expect(result).not.toBeNull()
		expect(result!.src).toContain('w.soundcloud.com/player')
		expect(result!.width).toBe(425)
		expect(result!.height).toBe(350)
	})

	it('extracts pixel dimensions from style attribute', () => {
		const result = extractIframeFromHtml(
			'<iframe src="https://example.com/embed" style="width: 600px; height: 400px;"></iframe>'
		)
		expect(result).toEqual({
			src: 'https://example.com/embed',
			width: 600,
			height: 400,
		})
	})

	it('prefers HTML attributes over style dimensions', () => {
		const result = extractIframeFromHtml(
			'<iframe width="800" height="600" src="https://example.com/embed" style="width: 400px; height: 300px;"></iframe>'
		)
		expect(result).toEqual({
			src: 'https://example.com/embed',
			width: 800,
			height: 600,
		})
	})

	it('returns null for non-HTTP src', () => {
		const result = extractIframeFromHtml(
			'<iframe src="javascript:alert(1)" width="100" height="100"></iframe>'
		)
		expect(result).toBeNull()
	})

	it('returns null for missing src', () => {
		const result = extractIframeFromHtml('<iframe width="100" height="100"></iframe>')
		expect(result).toBeNull()
	})

	it('returns null for non-iframe HTML', () => {
		const result = extractIframeFromHtml('<div>Hello world</div>')
		expect(result).toBeNull()
	})

	it('returns null for empty string', () => {
		const result = extractIframeFromHtml('')
		expect(result).toBeNull()
	})
})

describe('Pasting arbitrary iframe embeds', () => {
	it('creates an embed shape from an arbitrary iframe URL', () => {
		defaultHandleExternalEmbedContent(editor, {
			url: 'https://www.openstreetmap.org/export/embed.html?bbox=-0.1258',
			embed: { width: 425, height: 350 },
		})

		const shapes = editor.getCurrentPageShapes()
		const embedShape = shapes.find((s) => s.type === 'embed') as TLEmbedShape | undefined
		expect(embedShape).toBeDefined()
		expect(embedShape!.props.url).toBe(
			'https://www.openstreetmap.org/export/embed.html?bbox=-0.1258'
		)
		expect(embedShape!.props.w).toBe(425)
		expect(embedShape!.props.h).toBe(350)
	})

	it('creates an embed from a SoundCloud iframe', () => {
		defaultHandleExternalEmbedContent(editor, {
			url: 'https://w.soundcloud.com/player/?visual=true&url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F2184622839&show_artwork=true',
			embed: { width: 425, height: 350 },
		})

		const embedShape = editor.getOnlySelectedShape() as TLEmbedShape
		expect(embedShape).not.toBeNull()
		expect(embedShape.type).toBe('embed')
		expect(embedShape.props.url).toContain('w.soundcloud.com/player')
	})

	it('selects the created embed shape', () => {
		defaultHandleExternalEmbedContent(editor, {
			url: 'https://example.com/widget',
			embed: { width: 600, height: 400 },
		})

		const selected = editor.getOnlySelectedShape()
		expect(selected).not.toBeNull()
		expect(selected!.type).toBe('embed')
	})

	it('places the embed at the specified point', () => {
		defaultHandleExternalEmbedContent(editor, {
			url: 'https://example.com/widget',
			point: { x: 500, y: 500 },
			embed: { width: 200, height: 200 },
		})

		const embedShape = editor.getOnlySelectedShape() as TLEmbedShape
		expect(embedShape).not.toBeNull()
		expect(embedShape.x).toBeCloseTo(400, 0)
		expect(embedShape.y).toBeCloseTo(400, 0)
	})
})

describe('EmbedShapeUtil with unknown URLs', () => {
	it('allows resizing of embed shapes with unknown URLs', () => {
		editor.createShapes([
			{
				type: 'embed',
				x: 0,
				y: 0,
				props: {
					url: 'https://unknown-service.example.com/embed',
					w: 400,
					h: 300,
				},
			},
		])

		const shape = editor.getCurrentPageShapes().find((s) => s.type === 'embed') as TLEmbedShape
		const util = editor.getShapeUtil('embed')
		expect(util.canResize(shape)).toBe(true)
	})

	it('uses the shape dimensions for geometry of unknown embeds', () => {
		editor.createShapes([
			{
				type: 'embed',
				x: 0,
				y: 0,
				props: {
					url: 'https://unknown-service.example.com/embed',
					w: 500,
					h: 400,
				},
			},
		])

		const shape = editor.getCurrentPageShapes().find((s) => s.type === 'embed') as TLEmbedShape
		const bounds = editor.getShapeGeometry(shape).bounds
		expect(bounds.w).toBe(500)
		expect(bounds.h).toBe(400)
	})

	it('preserves behavior for known embed definitions', () => {
		editor.createShapes([
			{
				type: 'embed',
				x: 0,
				y: 0,
				props: {
					url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
					w: 720,
					h: 500,
				},
			},
		])

		const shape = editor.getCurrentPageShapes().find((s) => s.type === 'embed') as TLEmbedShape
		const util = editor.getShapeUtil('embed')
		// YouTube embeds have doesResize: true in the definition
		expect(util.canResize(shape)).toBe(true)
		// Geometry should use the shape's own dimensions
		const bounds = editor.getShapeGeometry(shape).bounds
		expect(bounds.w).toBe(720)
		expect(bounds.h).toBe(500)
	})
})
