import { Plugin, mergeConfig } from 'vite'
import baseConfig from './vite.config'

// Translations never render here — the page hides all UI — but the asset-urls module imports every
// locale (~2MB). Collapse them at the module graph level: each `./translations/xx.json?url` import
// resolves to one shared virtual module whose exported URL is an empty-JSON data URI — a valid "no
// strings" translation — so no locale file is ever emitted and the artifact stays origin-free
// without post-hoc rewriting of the bundle.
function emptyTranslationsPlugin(): Plugin {
	const EMPTY_TRANSLATION_ID = '\0empty-translation-url'
	return {
		name: 'inline-empty-translations',
		enforce: 'pre',
		resolveId(source) {
			if (source.endsWith('.json?url') && source.includes('translations/')) {
				return EMPTY_TRANSLATION_ID
			}
			return null
		},
		load(id) {
			if (id === EMPTY_TRANSLATION_ID) {
				return `export default 'data:application/json,%7B%7D'`
			}
			return null
		},
	}
}

// Second build pass: the thumbnail render entry as a single self-contained artifact, for the
// worker's html-mode captures (see scripts/build.ts, which inlines the emitted JS and CSS into the
// HTML afterwards). One chunk, no code splitting, every asset — fonts included — as a data URI, so
// the page needs no origin at all: Browser Run receives the whole document in the request and the
// browser fetches nothing.
export default async (env: { mode: string; command: 'build' | 'serve' }) => {
	const resolved = typeof baseConfig === 'function' ? await baseConfig(env as any) : baseConfig
	return mergeConfig(resolved, {
		plugins: [emptyTranslationsPlugin()],
		build: {
			outDir: 'dist-inline',
			emptyOutDir: true,
			// One JS file, and only this entry: mergeConfig replaces the base config's two-entry input
			// map with this string, so the index entry is not built twice. Chunk imports would be
			// /assets/ fetches, which an origin-less document cannot make.
			rollupOptions: {
				input: 'thumbnail-render.html',
				output: { inlineDynamicImports: true },
			},
			cssCodeSplit: false,
			// Everything the bundle references rides along as data URIs. The main build pins this to
			// 0 because the app's svg icon handling breaks as data urls; this page hides all UI, so
			// none of that chrome is ever drawn.
			assetsInlineLimit: () => true,
			// A source map for an inlined bundle would double the artifact for nothing.
			sourcemap: false,
		},
	})
}
