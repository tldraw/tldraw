import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { chromium } from '@playwright/test'
// Pixel comparison for the native SVG text renderer.
//
// For every rich corpus document, three bitmaps of the same box are produced:
//   reference — Chromium rendering the HTML the way tldraw's <foreignObject> export does
//   chromium  — Chromium rendering our native <text>/<tspan> SVG
//   resvg     — @resvg/resvg-js rendering the same SVG with the fonts supplied as TTF
// and the fraction of differing pixels against the reference is reported.
import { Resvg } from '@resvg/resvg-js'
import { fontFaceCss, tldrawFontFiles } from './chromium'
import { FAMILIES, FamilyKey, LINE_HEIGHT } from './corpus'
import { EngineResult } from './engine'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../../..')

// resvg finds fonts by the name inside the file, not by tldraw's CSS alias.
const RESVG_FAMILY: Record<string, string> = {
	tldraw_draw: 'Shantell Sans Informal',
	tldraw_sans: 'IBM Plex Sans',
	tldraw_serif: 'IBM Plex Serif',
	tldraw_mono: 'IBM Plex Mono',
}

export function mapFamilyForResvg(family: string) {
	return family.replace(/'?(tldraw_\w+)'?/g, (_, name) => `'${RESVG_FAMILY[name] ?? name}'`)
}

/**
 * resvg only matches families from `fontFiles` (its `fontBuffers` option never matched any family
 * in testing), and fontdb reads ttf/otf only, so the woff2 files are decompressed into a temp
 * directory and passed by path.
 */
export async function decompressFonts(): Promise<string[]> {
	const wawoff2 = (await import('wawoff2')) as { decompress(data: Uint8Array): Promise<Uint8Array> }
	const dir = join(tmpdir(), 'tldraw-rich-text-layout-fonts')
	mkdirSync(dir, { recursive: true })
	const out: string[] = []
	for (const f of tldrawFontFiles()) {
		const path = join(dir, f.file.replace(/\.woff2$/, '.ttf'))
		if (!existsSync(path)) {
			writeFileSync(path, Buffer.from(await wawoff2.decompress(new Uint8Array(f.data))))
		}
		out.push(path)
	}
	return out
}

export interface PixelCase {
	id: string
	docKey: string
	family: FamilyKey
	fontSize: number
	maxWidth: number | null
	textAlign: string
	html: string
	engine: EngineResult & { svg: string }
}

export interface PixelResult {
	id: string
	width: number
	height: number
	chromiumDiff: number
	resvgDiff: number
}

function diffRatio(a: Uint8ClampedArray, b: Uint8ClampedArray) {
	let differing = 0
	const n = Math.min(a.length, b.length) / 4
	for (let i = 0; i < n; i++) {
		const o = i * 4
		// alpha-weighted luminance distance; antialiasing differences below 48/255 are ignored
		const la = (a[o] * 0.3 + a[o + 1] * 0.59 + a[o + 2] * 0.11) * (a[o + 3] / 255)
		const lb = (b[o] * 0.3 + b[o + 1] * 0.59 + b[o + 2] * 0.11) * (b[o + 3] / 255)
		if (Math.abs(la - lb) > 48) differing++
	}
	return n === 0 ? 0 : differing / n
}

export async function comparePixels(cases: PixelCase[]): Promise<PixelResult[]> {
	const { createCanvas, loadImage } = await import('@napi-rs/canvas')
	const ttfs = await decompressFonts()
	const editorCss = readFileSync(join(ROOT, 'packages/editor/editor.css'), 'utf8')
	const browser = await chromium.launch()
	const page = await browser.newPage({
		viewport: { width: 1400, height: 1000 },
		deviceScaleFactor: 1,
	})
	await page.setContent(
		`<!doctype html><html><head><style>${fontFaceCss()}</style><style>${editorCss}</style>
		<style>body{margin:0;background:#fff} #box{position:absolute;left:0;top:0;overflow:visible}</style></head>
		<body><div class="tl-container tl-theme__light" style="position:absolute;inset:0"><div id="box"></div></div></body></html>`
	)
	await page.evaluate(async () => {
		await (document as any).fonts.ready
		await Promise.all([...(document as any).fonts].map((f: any) => f.load()))
	})

	async function pixels(png: Buffer, width: number, height: number) {
		const img = await loadImage(png)
		const canvas = createCanvas(width, height)
		const ctx = canvas.getContext('2d')
		ctx.fillStyle = '#fff'
		ctx.fillRect(0, 0, width, height)
		ctx.drawImage(img, 0, 0)
		return ctx.getImageData(0, 0, width, height).data
	}

	const results: PixelResult[] = []
	for (const c of cases) {
		const width = Math.max(1, Math.ceil(c.engine.w))
		const height = Math.max(1, Math.ceil(c.engine.h))
		const lineHeightPx = Math.round(c.fontSize * LINE_HEIGHT)
		const fontFamily = FAMILIES[c.family]

		// reference: the foreignObject markup from RichTextSVG, top/start aligned
		await page.evaluate(
			({ html, width, height, fontFamily, fontSize, lineHeightPx, textAlign }) => {
				const box = document.getElementById('box')!
				box.style.width = `${width}px`
				box.style.height = `${height}px`
				box.innerHTML = `<div style="display:flex;font-family:${fontFamily};height:100%;justify-content:flex-start;align-items:flex-start;padding:0px"><div class="tl-rich-text" style="font-size:${fontSize}px;color:#000;line-height:${lineHeightPx}px;--tl-rich-text-heading-line-height:1.35;text-align:${textAlign};width:100%;word-wrap:break-word;overflow-wrap:break-word;white-space:pre-wrap;tab-size:2">${html}</div></div>`
			},
			{
				html: c.html,
				width,
				height,
				fontFamily,
				fontSize: c.fontSize,
				lineHeightPx,
				textAlign: c.textAlign,
			}
		)
		const reference = await page.screenshot({ clip: { x: 0, y: 0, width, height } })

		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${c.engine.svg}</svg>`
		await page.evaluate((svg) => {
			document.getElementById('box')!.innerHTML = svg
		}, svg)
		const chromiumNative = await page.screenshot({ clip: { x: 0, y: 0, width, height } })

		const resvgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${mapFamilyForResvg(c.engine.svg)}</svg>`
		const resvg = new Resvg(resvgSvg, {
			font: { fontFiles: ttfs, loadSystemFonts: false, defaultFontFamily: 'IBM Plex Sans' },
			background: '#ffffff',
		})
		const resvgPng = Buffer.from(resvg.render().asPng())

		const ref = await pixels(reference, width, height)
		results.push({
			id: c.id,
			width,
			height,
			chromiumDiff: diffRatio(ref, await pixels(chromiumNative, width, height)),
			resvgDiff: diffRatio(ref, await pixels(resvgPng, width, height)),
		})
	}
	await browser.close()
	return results
}
