import { mergeConfig } from 'vite'
import baseConfig from './vite.config'

// Second build pass: the thumbnail render entry as a single self-contained artifact, for the
// worker's html-mode captures (see scripts/build.ts, which inlines the emitted JS and CSS into the
// HTML afterwards). One chunk, no code splitting, every asset — fonts included — as a data URI, so
// the page needs no origin at all: Browser Run receives the whole document in the request and the
// browser fetches nothing.
export default async (env: { mode: string; command: 'build' | 'serve' }) => {
	const resolved = typeof baseConfig === 'function' ? await baseConfig(env as any) : baseConfig
	const merged = mergeConfig(resolved, {
		build: {
			outDir: 'dist-inline',
			emptyOutDir: true,
			// One JS file: chunk imports would be /assets/ fetches, which an origin-less document
			// cannot make.
			rollupOptions: {
				input: 'thumbnail-render.html',
				output: { inlineDynamicImports: true },
			},
			cssCodeSplit: false,
			// Everything the bundle references rides along as data URIs. The main build pins this to
			// 0 because the app's svg icon handling breaks as data urls; this page hides all UI, so
			// none of that chrome is ever drawn. Translations are the one exclusion: the asset-urls
			// module imports every locale (~2MB) and the render page, UI hidden, can never show a
			// translated string — they stay as file references here and the assembly step in
			// scripts/build.ts rewrites those references to empty-JSON stubs.
			assetsInlineLimit: (filePath: string) => !filePath.endsWith('.json'),
			// A source map for an inlined bundle would double the artifact for nothing.
			sourcemap: false,
		},
	})
	// Force-set rather than merged: mergeConfig would union this input with the base config's
	// two-entry map, and the index entry must not be built twice.
	merged.build.rollupOptions.input = 'thumbnail-render.html'
	return merged
}
