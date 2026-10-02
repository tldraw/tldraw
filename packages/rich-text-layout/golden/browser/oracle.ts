import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { chromium, webkit } from '@playwright/test'
import { build } from 'esbuild'
import { BrowserName, fontFaceCss, tldrawFontFiles } from '../chromium'
import type { BoardShapeResult, FuzzCase, FuzzResult } from './page'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../../../..')

function fontAssetUrls() {
	return Object.fromEntries(
		tldrawFontFiles().map((f) => [f.key, `data:font/woff2;base64,${f.data.toString('base64')}`])
	)
}

async function bundle() {
	const result = await build({
		entryPoints: [join(__dirname, 'page.ts')],
		bundle: true,
		write: false,
		format: 'iife',
		platform: 'browser',
		target: 'es2022',
		define: { 'process.env.NODE_ENV': '"production"' },
		loader: { '.css': 'empty' },
		logLevel: 'error',
	})
	return result.outputFiles[0].text
}

export interface Oracle {
	measureCases(cases: FuzzCase[]): Promise<FuzzResult[]>
	measureBoard(snapshot: unknown): Promise<{ results: BoardShapeResult[]; error?: string }>
	close(): Promise<void>
}

export async function launchOracle(browserName: BrowserName = 'chromium'): Promise<Oracle> {
	const script = await bundle()
	const editorCss = readFileSync(join(ROOT, 'packages/editor/editor.css'), 'utf8')
	const browser = await (browserName === 'webkit' ? webkit : chromium).launch()
	const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } })
	page.on('pageerror', (e) => console.error('[page]', e.message))
	await page.setContent(
		`<!doctype html><html><head><style>${fontFaceCss()}</style><style>${editorCss}</style></head><body></body></html>`
	)
	await page.evaluate(async () => {
		await document.fonts.ready
		await Promise.all([...document.fonts].map((f) => f.load()))
	})
	await page.addScriptTag({ content: script })
	await page.evaluate((urls) => window.__rtl.init(urls), fontAssetUrls())
	return {
		measureCases: (cases) => page.evaluate((cases) => window.__rtl.measureCases(cases), cases),
		measureBoard: (snapshot) => page.evaluate((s) => window.__rtl.measureBoard(s), snapshot),
		close: () => browser.close(),
	}
}
