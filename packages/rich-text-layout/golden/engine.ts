// The Node side of the golden harness: tldraw's fonts in @napi-rs/canvas, and the same options
// tldraw's TextManager.measureText applies (pre-wrap, break-word, tab-size 2, whole-pixel line
// height).
import { existsSync } from 'fs'
import { createNodeMeasureContext } from '../src/backends/node'
import { layoutPlainText } from '../src/layout/plainText'
import { installMeasureContext } from '../src/measure/install'
import { tldrawFontFiles } from './chromium'
import { FAMILIES, FamilyKey, LINE_HEIGHT } from './corpus'

// System fonts Chromium on macOS falls back to for scripts tldraw's fonts don't cover. They are
// registered under aliases and appended as fallback families, which is what a container
// deployment would do with bundled fallback fonts. Missing files are skipped.
const MAC_FALLBACKS: [alias: string, path: string][] = [
	['fb_emoji', '/System/Library/Fonts/Apple Color Emoji.ttc'],
	['fb_arabic', '/System/Library/Fonts/GeezaPro.ttc'],
	['fb_hebrew', '/System/Library/Fonts/LucidaGrande.ttc'],
	['fb_thai', '/System/Library/Fonts/ThonburiUI.ttc'],
	['fb_korean', '/System/Library/Fonts/AppleSDGothicNeo.ttc'],
	['fb_cjk', '/System/Library/Fonts/Hiragino Sans GB.ttc'],
]

export async function installTldrawFonts(withFallbacks = true) {
	const fallbacks = withFallbacks ? MAC_FALLBACKS.filter(([, path]) => existsSync(path)) : []
	const ctx = await createNodeMeasureContext({
		fonts: [
			...tldrawFontFiles().map((f) => ({ family: f.family, data: f.data })),
			...fallbacks.map(([alias, path]) => ({ family: alias, path })),
		],
		fallbackFamilies: fallbacks.map(([alias]) => alias),
	})
	await installMeasureContext(ctx)
	return ctx
}

export function normalizeTextForDom(text: string) {
	return text
		.replace(/\r?\n|\r/g, '\n')
		.split('\n')
		.map((x) => x || ' ')
		.join('\n')
}

export interface EngineResult {
	id: string
	w: number
	h: number
	lines: number
	lineTops: number[]
}

export function measurePlainInEngine(req: {
	id: string
	text: string
	family: FamilyKey
	fontSize: number
	maxWidth: number | null
}): EngineResult {
	const layout = layoutPlainText(normalizeTextForDom(req.text), {
		style: {
			fontFamily: FAMILIES[req.family],
			fontSize: req.fontSize,
			fontWeight: 'normal',
			fontStyle: 'normal',
			lineHeight: `${Math.round(req.fontSize * LINE_HEIGHT)}px`,
			whiteSpace: 'pre-wrap',
			overflowWrap: 'break-word',
			// tab-size 2 only applies inside .tl-rich-text; plain measurement gets the UA default
			tabSize: 8,
			direction: 'auto',
		},
		maxWidth: req.maxWidth,
	})
	return {
		id: req.id,
		w: layout.width,
		h: layout.height,
		lines: layout.lines.length,
		lineTops: layout.lines.map((l) => l.y),
	}
}
