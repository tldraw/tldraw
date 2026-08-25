import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { Resvg } from '@resvg/resvg-js'
import { createShapeId, toRichText } from '@tldraw/editor'
import { createNodeMeasureContext, installMeasureContext } from '@tldraw/rich-text-layout'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
	createTldrawTextMeasurer,
	TldrawTextMeasurer,
} from '../lib/utils/text/createTldrawTextMeasurer'
import { parseTldrawJsonFile, serializeTldrawJson } from '../lib/utils/tldr/file'
import { TestEditor } from './TestEditor'

// Headless end to end: a real editor measures shape geometry with the rich text layout engine
// instead of the DOM, exports native <text> SVG, and resvg rasterizes it without a browser.

const FONTS = join(__dirname, '../../../assets/fonts')
const FIXTURE = join(__dirname, '__fixtures__/native-text-export.tldr')
const SNAPSHOT = join(__dirname, '__snapshots__/native-text-export.png')

// [asset key, family, file] for every face tldraw ships; the key is what `fontAssetUrls` maps.
const FONT_FILES: [key: string, family: string, file: string][] = [
	['tldraw_draw', 'tldraw_draw', 'Shantell_Sans-Informal_Regular.woff2'],
	['tldraw_draw_bold', 'tldraw_draw', 'Shantell_Sans-Informal_Bold.woff2'],
	['tldraw_draw_italic', 'tldraw_draw', 'Shantell_Sans-Informal_Regular_Italic.woff2'],
	['tldraw_draw_italic_bold', 'tldraw_draw', 'Shantell_Sans-Informal_Bold_Italic.woff2'],
	['tldraw_sans', 'tldraw_sans', 'IBMPlexSans-Medium.woff2'],
	['tldraw_sans_bold', 'tldraw_sans', 'IBMPlexSans-Bold.woff2'],
	['tldraw_sans_italic', 'tldraw_sans', 'IBMPlexSans-MediumItalic.woff2'],
	['tldraw_sans_italic_bold', 'tldraw_sans', 'IBMPlexSans-BoldItalic.woff2'],
	['tldraw_serif', 'tldraw_serif', 'IBMPlexSerif-Medium.woff2'],
	['tldraw_serif_bold', 'tldraw_serif', 'IBMPlexSerif-Bold.woff2'],
	['tldraw_serif_italic', 'tldraw_serif', 'IBMPlexSerif-MediumItalic.woff2'],
	['tldraw_serif_italic_bold', 'tldraw_serif', 'IBMPlexSerif-BoldItalic.woff2'],
	['tldraw_mono', 'tldraw_mono', 'IBMPlexMono-Medium.woff2'],
	['tldraw_mono_bold', 'tldraw_mono', 'IBMPlexMono-Bold.woff2'],
	['tldraw_mono_italic', 'tldraw_mono', 'IBMPlexMono-MediumItalic.woff2'],
	['tldraw_mono_italic_bold', 'tldraw_mono', 'IBMPlexMono-BoldItalic.woff2'],
]

// resvg resolves fonts by the family name inside the file, not tldraw's CSS alias.
const RESVG_FAMILIES: Record<string, string> = {
	tldraw_draw: 'Shantell Sans Informal',
	tldraw_sans: 'IBM Plex Sans',
	tldraw_serif: 'IBM Plex Serif',
	tldraw_mono: 'IBM Plex Mono',
}

let measurer: TldrawTextMeasurer

// The export embeds @font-face rules for the fonts in use; jsdom can't fetch font files, so
// hand them over as data urls.
const fontAssetUrls = Object.fromEntries(
	FONT_FILES.map(([key, , file]) => [
		key,
		`data:font/woff2;base64,${readFileSync(join(FONTS, file)).toString('base64')}`,
	])
)

vi.useRealTimers()

beforeAll(async () => {
	const measureContext = await createNodeMeasureContext({
		fonts: FONT_FILES.map(([, family, file]) => ({
			family,
			data: readFileSync(join(FONTS, file)),
		})),
	})
	await installMeasureContext(measureContext)
	measurer = createTldrawTextMeasurer({ measureContext })
})

function richText(doc: unknown) {
	return doc as ReturnType<typeof toRichText>
}

function createShapes(editor: TestEditor) {
	const ids = {
		text: createShapeId('text'),
		geo: createShapeId('geo'),
		note: createShapeId('note'),
		arrow: createShapeId('arrow'),
		frame: createShapeId('frame'),
	}
	editor.createShapes([
		{
			id: ids.frame,
			type: 'frame',
			x: -40,
			y: -60,
			props: { w: 720, h: 520, name: 'Headless export' },
		},
		{
			id: ids.text,
			type: 'text',
			x: 0,
			y: 0,
			props: {
				richText: richText({
					type: 'doc',
					content: [
						{
							type: 'heading',
							attrs: { level: 2, dir: 'auto' },
							content: [{ type: 'text', text: 'Rich text, no DOM' }],
						},
						{
							type: 'paragraph',
							attrs: { dir: 'auto' },
							content: [
								{ type: 'text', text: 'Laid out with ' },
								{ type: 'text', text: 'pretext', marks: [{ type: 'bold' }] },
								{ type: 'text', text: ', rendered as ' },
								{ type: 'text', text: '<text>', marks: [{ type: 'code' }] },
								{ type: 'text', text: ' and ' },
								{ type: 'text', text: 'highlighted', marks: [{ type: 'highlight' }] },
								{ type: 'text', text: '.' },
							],
						},
						{
							type: 'bulletList',
							content: [
								{
									type: 'listItem',
									content: [
										{
											type: 'paragraph',
											attrs: { dir: 'auto' },
											content: [{ type: 'text', text: 'bullets' }],
										},
									],
								},
								{
									type: 'listItem',
									content: [
										{
											type: 'paragraph',
											attrs: { dir: 'auto' },
											content: [
												{ type: 'text', text: 'and ' },
												{ type: 'text', text: 'italics', marks: [{ type: 'italic' }] },
											],
										},
									],
								},
							],
						},
					],
				}),
				font: 'sans',
				size: 'm',
				autoSize: true,
			},
		},
		{
			id: ids.geo,
			type: 'geo',
			x: 0,
			y: 200,
			props: {
				w: 220,
				h: 120,
				geo: 'rectangle',
				font: 'draw',
				richText: toRichText('A geo label that wraps onto several lines'),
			},
		},
		{
			id: ids.note,
			type: 'note',
			x: 300,
			y: 200,
			props: {
				font: 'serif',
				richText: richText({
					type: 'doc',
					content: [
						{
							type: 'paragraph',
							attrs: { dir: 'auto' },
							content: [
								{ type: 'text', text: 'Sticky ' },
								{ type: 'text', text: 'note', marks: [{ type: 'bold' }] },
							],
						},
						{
							type: 'orderedList',
							content: [
								{
									type: 'listItem',
									content: [
										{
											type: 'paragraph',
											attrs: { dir: 'auto' },
											content: [{ type: 'text', text: 'one' }],
										},
									],
								},
								{
									type: 'listItem',
									content: [
										{
											type: 'paragraph',
											attrs: { dir: 'auto' },
											content: [{ type: 'text', text: 'two' }],
										},
									],
								},
							],
						},
					],
				}),
			},
		},
		{
			id: ids.arrow,
			type: 'arrow',
			x: 240,
			y: 260,
			props: {
				start: { x: 0, y: 0 },
				end: { x: 60, y: 0 },
				font: 'mono',
				richText: toRichText('label'),
			},
		},
	])
	return ids
}

describe('native text export without a DOM layout engine', () => {
	it('sizes shapes with the injected measurer and exports <text> that resvg can rasterize', async () => {
		// The fixture is a real .tldr round-tripped through parseTldrawJsonFile so the headless
		// path covers file loading too. It is generated once and committed.
		if (!existsSync(FIXTURE) || process.env.UPDATE_NATIVE_TEXT_SNAPSHOT) {
			const source = new TestEditor({ textMeasurer: measurer, fontAssetUrls })
			createShapes(source)
			writeFileSync(FIXTURE, await serializeTldrawJson(source))
			source.dispose()
		}
		const parsed = parseTldrawJsonFile({
			json: readFileSync(FIXTURE, 'utf8'),
			schema: new TestEditor({ textMeasurer: measurer, fontAssetUrls }).store.schema,
		})
		if (!parsed.ok) throw new Error(`could not parse fixture: ${parsed.error.type}`)

		const editor = new TestEditor(
			{ textMeasurer: measurer },
			{ initialData: parsed.value.serialize() }
		)
		const shapes = editor.getCurrentPageShapesSorted()
		expect(shapes.map((s) => s.type).sort()).toEqual(['arrow', 'frame', 'geo', 'note', 'text'])

		// Geometry comes from the engine, not the character-count fake: the text shape is as wide
		// as its longest line at real advances, and the geo label grew the shape's height.
		const text = shapes.find((s) => s.type === 'text')!
		const textBounds = editor.getShapeGeometry(text).bounds
		expect(textBounds.width).toBeGreaterThan(550)
		expect(textBounds.width).toBeLessThan(750)
		expect(textBounds.height).toBeGreaterThan(120)

		const result = await editor.getSvgString(shapes, {
			text: 'native',
			background: true,
			padding: 16,
		})
		expect(result).toBeDefined()
		const { svg } = result!

		// native text, no HTML islands for labels
		expect(svg).toContain('<text')
		expect(svg).toContain('<tspan')
		expect(svg).toContain('pretext')
		expect(svg).not.toContain('tl-rich-text-svg')
		expect(svg).toMatch(/font-weight="bold"/)
		expect(svg).toMatch(/font-family="'tldraw_mono', monospace"/)

		// rasterize with resvg: it reads ttf/otf files by path and matches the family names
		// inside them, so decompress the woff2 files into a temp directory first
		const wawoff2 = (await import('wawoff2')) as {
			decompress(data: Uint8Array): Promise<Uint8Array>
		}
		const dir = mkdtempSync(join(tmpdir(), 'tldraw-native-text-'))
		const fontFiles: string[] = []
		for (const [, , file] of FONT_FILES) {
			const path = join(dir, file.replace(/\.woff2$/, '.ttf'))
			writeFileSync(
				path,
				Buffer.from(await wawoff2.decompress(new Uint8Array(readFileSync(join(FONTS, file)))))
			)
			fontFiles.push(path)
		}
		const svgForResvg = svg.replace(/tldraw_(draw|sans|serif|mono)/g, (m) => RESVG_FAMILIES[m])
		const png = new Resvg(svgForResvg, {
			font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'IBM Plex Sans' },
		})
			.render()
			.asPng()
		expect(png.length).toBeGreaterThan(1000)

		// Pixel snapshot, compared as decoded pixels rather than bytes so a different PNG encoder
		// doesn't fail the test. A missing snapshot fails rather than regenerating silently;
		// regenerate both fixture and snapshot with UPDATE_NATIVE_TEXT_SNAPSHOT=1.
		if (process.env.UPDATE_NATIVE_TEXT_SNAPSHOT) writeFileSync(SNAPSHOT, png)
		const expected = readFileSync(SNAPSHOT)
		const { createCanvas, loadImage } = await import('@napi-rs/canvas')
		const decode = async (data: Uint8Array) => {
			const image = await loadImage(Buffer.from(data))
			const canvas = createCanvas(image.width, image.height)
			const ctx = canvas.getContext('2d')
			ctx.drawImage(image, 0, 0)
			return {
				width: image.width,
				height: image.height,
				data: ctx.getImageData(0, 0, image.width, image.height).data,
			}
		}
		const a = await decode(png)
		const b = await decode(expected)
		expect([a.width, a.height]).toEqual([b.width, b.height])
		let differing = 0
		for (let i = 0; i < a.data.length; i += 4) {
			const da =
				Math.abs(a.data[i] - b.data[i]) +
				Math.abs(a.data[i + 1] - b.data[i + 1]) +
				Math.abs(a.data[i + 2] - b.data[i + 2])
			if (da > 48) differing++
		}
		expect(differing / (a.data.length / 4)).toBeLessThan(0.005)
	})
})
