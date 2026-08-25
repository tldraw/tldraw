/* eslint-disable no-console */
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
// Measures corpus cases in Chromium with the exact element structure and styles tldraw's DOM
// TextManager uses (see packages/editor/src/lib/editor/managers/TextManager/TextManager.ts and
// the .tl-text / .tl-text-measure / .tl-rich-text rules in packages/editor/editor.css).
import { chromium } from '@playwright/test'

const __dirname = dirname(fileURLToPath(import.meta.url))
import { FAMILIES, FamilyKey, LINE_HEIGHT } from './corpus'

const ROOT = join(__dirname, '../../..')
const FONT_FILES: Record<string, { family: string; weight: string; style: string; file: string }> =
	{
		tldraw_draw: {
			family: 'tldraw_draw',
			weight: 'normal',
			style: 'normal',
			file: 'Shantell_Sans-Informal_Regular.woff2',
		},
		tldraw_draw_bold: {
			family: 'tldraw_draw',
			weight: 'bold',
			style: 'normal',
			file: 'Shantell_Sans-Informal_Bold.woff2',
		},
		tldraw_draw_italic: {
			family: 'tldraw_draw',
			weight: 'normal',
			style: 'italic',
			file: 'Shantell_Sans-Informal_Regular_Italic.woff2',
		},
		tldraw_draw_italic_bold: {
			family: 'tldraw_draw',
			weight: 'bold',
			style: 'italic',
			file: 'Shantell_Sans-Informal_Bold_Italic.woff2',
		},
		tldraw_sans: {
			family: 'tldraw_sans',
			weight: 'normal',
			style: 'normal',
			file: 'IBMPlexSans-Medium.woff2',
		},
		tldraw_sans_bold: {
			family: 'tldraw_sans',
			weight: 'bold',
			style: 'normal',
			file: 'IBMPlexSans-Bold.woff2',
		},
		tldraw_sans_italic: {
			family: 'tldraw_sans',
			weight: 'normal',
			style: 'italic',
			file: 'IBMPlexSans-MediumItalic.woff2',
		},
		tldraw_sans_italic_bold: {
			family: 'tldraw_sans',
			weight: 'bold',
			style: 'italic',
			file: 'IBMPlexSans-BoldItalic.woff2',
		},
		tldraw_serif: {
			family: 'tldraw_serif',
			weight: 'normal',
			style: 'normal',
			file: 'IBMPlexSerif-Medium.woff2',
		},
		tldraw_serif_bold: {
			family: 'tldraw_serif',
			weight: 'bold',
			style: 'normal',
			file: 'IBMPlexSerif-Bold.woff2',
		},
		tldraw_serif_italic: {
			family: 'tldraw_serif',
			weight: 'normal',
			style: 'italic',
			file: 'IBMPlexSerif-MediumItalic.woff2',
		},
		tldraw_serif_italic_bold: {
			family: 'tldraw_serif',
			weight: 'bold',
			style: 'italic',
			file: 'IBMPlexSerif-BoldItalic.woff2',
		},
		tldraw_mono: {
			family: 'tldraw_mono',
			weight: 'normal',
			style: 'normal',
			file: 'IBMPlexMono-Medium.woff2',
		},
		tldraw_mono_bold: {
			family: 'tldraw_mono',
			weight: 'bold',
			style: 'normal',
			file: 'IBMPlexMono-Bold.woff2',
		},
		tldraw_mono_italic: {
			family: 'tldraw_mono',
			weight: 'normal',
			style: 'italic',
			file: 'IBMPlexMono-MediumItalic.woff2',
		},
		tldraw_mono_italic_bold: {
			family: 'tldraw_mono',
			weight: 'bold',
			style: 'italic',
			file: 'IBMPlexMono-BoldItalic.woff2',
		},
	}

export function tldrawFontFiles() {
	return Object.values(FONT_FILES).map((f) => ({
		...f,
		data: readFileSync(join(ROOT, 'packages/assets/fonts', f.file)),
	}))
}

export function fontFaceCss() {
	return tldrawFontFiles()
		.map(
			(f) =>
				`@font-face { font-family: "${f.family}"; font-weight: ${f.weight}; font-style: ${f.style}; src: url("data:font/woff2;base64,${f.data.toString('base64')}") format("woff2"); }`
		)
		.join('\n')
}

export interface ChromiumRequest {
	id: string
	/** innerHTML of the measure element */
	html: string
	family: FamilyKey
	fontSize: number
	maxWidth: number | null
	minWidth?: number | null
	/** Extra inline styles (e.g. text-align) */
	otherStyles?: Record<string, string>
}

export interface ChromiumResult {
	id: string
	w: number
	h: number
	scrollWidth: number
	lines: number
	/** y-sorted line boxes found via text ranges: [top, height] */
	lineTops: number[]
}

export function plainTextToHtml(text: string) {
	// TextManager.measureText: normalizeTextForDom then textContent → innerHTML
	const normalized = text
		.replace(/\r?\n|\r/g, '\n')
		.split('\n')
		.map((x) => x || ' ')
		.join('\n')
	return normalized.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function measureInChromium(requests: ChromiumRequest[]): Promise<ChromiumResult[]> {
	const editorCss = readFileSync(join(ROOT, 'packages/editor/editor.css'), 'utf8')
	const browser = await chromium.launch()
	const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } })
	await page.setContent(
		`<!doctype html><html><head><style>${fontFaceCss()}</style><style>${editorCss}</style></head>
		<body><div class="tl-container tl-theme__light" style="position:absolute;inset:0"><div class="tl-text tl-text-measure" dir="auto" id="m"></div></div></body></html>`
	)
	await page.evaluate(async () => {
		await (document as any).fonts.ready
		// fonts.ready doesn't load faces nothing has used yet
		const faces = [...(document as any).fonts]
		await Promise.all(faces.map((f: any) => f.load()))
	})

	const results: ChromiumResult[] = []
	const BATCH = 200
	for (let i = 0; i < requests.length; i += BATCH) {
		const batch = requests.slice(i, i + BATCH).map((r) => ({
			...r,
			fontFamily: FAMILIES[r.family],
			lineHeight: Math.round(r.fontSize * LINE_HEIGHT),
		}))
		const out: ChromiumResult[] = await page.evaluate((batch) => {
			const elm = document.getElementById('m') as HTMLDivElement
			const initial: Record<string, string | null> = {
				'overflow-wrap': 'break-word',
				'word-break': 'auto',
				width: null,
				height: null,
				'max-width': null,
				'min-width': null,
			}
			const out: any[] = []
			for (const r of batch) {
				elm.removeAttribute('style')
				for (const [k, v] of Object.entries(initial)) if (v !== null) elm.style.setProperty(k, v)
				const styles: Record<string, string | undefined> = {
					'font-family': r.fontFamily,
					'font-style': 'normal',
					'font-weight': 'normal',
					'font-size': r.fontSize + 'px',
					'line-height': `${r.lineHeight}px`,
					'--tl-rich-text-heading-line-height': `${1.35}`,
					padding: '0px',
					'max-width': r.maxWidth ? r.maxWidth + 'px' : undefined,
					'min-width': r.minWidth ? r.minWidth + 'px' : undefined,
					'overflow-wrap': 'break-word',
					...r.otherStyles,
				}
				for (const [k, v] of Object.entries(styles))
					if (typeof v === 'string') elm.style.setProperty(k, v)
				elm.innerHTML = r.html
				const rect = elm.getBoundingClientRect()
				const scrollWidth = elm.scrollWidth
				// line boxes: bucket text-node client rects by top
				const tops = new Map<number, number>()
				const walker = document.createTreeWalker(elm, NodeFilter.SHOW_TEXT)
				let node: Node | null
				while ((node = walker.nextNode())) {
					const range = document.createRange()
					range.selectNodeContents(node)
					for (const cr of range.getClientRects()) {
						if (cr.width === 0 && cr.height === 0) continue
						const top = Math.round((cr.top - rect.top) * 100) / 100
						tops.set(top, Math.max(tops.get(top) ?? 0, cr.height))
					}
				}
				// <br> elements produce lines too
				for (const br of elm.querySelectorAll('br')) {
					const range = document.createRange()
					range.selectNode(br)
					for (const cr of range.getClientRects()) {
						const top = Math.round((cr.top - rect.top) * 100) / 100
						if (!tops.has(top)) tops.set(top, cr.height)
					}
				}
				// Runs in different fonts on one line have different content-area tops; cluster
				// tops closer than half the base line height into one line.
				const sortedTops = [...tops.keys()].sort((a, b) => a - b)
				const lineTops: number[] = []
				for (const top of sortedTops) {
					if (lineTops.length === 0 || top - lineTops[lineTops.length - 1] > r.lineHeight / 2) {
						lineTops.push(top)
					}
				}
				out.push({
					id: r.id,
					w: rect.width,
					h: rect.height,
					scrollWidth,
					lines: lineTops.length,
					lineTops,
				})
			}
			return out
		}, batch)
		results.push(...out)
		console.log(`  measured ${results.length}/${requests.length}`)
	}
	await browser.close()
	return results
}
