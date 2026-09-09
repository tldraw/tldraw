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

function escapeRegExp(text: string) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Folds the build's one chunk and one stylesheet into the entry HTML and emits that as the
// artifact, in place of the files it consumed. Works from the bundle Vite hands over rather than
// from filenames guessed on disk, so a change to Vite's chunk or CSS naming cannot make this pick
// up the wrong file while the artifact still passes its own checks. Named after the entry with an
// `-inline` suffix; scripts/build.ts checks that against THUMBNAIL_RENDER_INLINE_PATH (this config
// is loaded by Node, which cannot import the workspace package's TypeScript source directly).
function inlineRenderEntryPlugin(): Plugin {
	return {
		name: 'inline-render-entry',
		enforce: 'post',
		generateBundle(_options, bundle) {
			const outputs = Object.values(bundle)
			const html = outputs.find((o) => o.type === 'asset' && o.fileName.endsWith('.html'))
			const chunks = outputs.filter((o) => o.type === 'chunk')
			const styles = outputs.filter((o) => o.type === 'asset' && o.fileName.endsWith('.css'))
			if (html?.type !== 'asset' || chunks.length !== 1 || styles.length !== 1) {
				throw new Error(
					`inline render build must produce one html, one chunk and one stylesheet; got ${outputs.map((o) => o.fileName).join(', ')}`
				)
			}
			const [chunk] = chunks
			const [style] = styles
			if (style.type !== 'asset') throw new Error('unreachable')

			// Escape the sequences that would end an inline block early. `<!--` in script data
			// opens an escaped state in which a later `<script` swallows the real closing tag.
			const js = chunk.code.replaceAll('</script', '<\\/script').replaceAll('<!--', '<\\!--')
			const css = String(style.source).replaceAll('</style', '<\\/style')
			const scriptTag = new RegExp(
				`<script[^>]*src="[^"]*${escapeRegExp(chunk.fileName)}"[^>]*></script>`
			)
			const linkTag = new RegExp(`<link[^>]*href="[^"]*${escapeRegExp(style.fileName)}"[^>]*/?>`)
			const source = String(html.source)
			if (!scriptTag.test(source) || !linkTag.test(source)) {
				throw new Error('inline render html does not reference the chunk and stylesheet it built')
			}
			// Replacer functions, not replacement strings: a multi-megabyte replacement is effectively
			// guaranteed to contain `$&`/`$'` sequences, which String.replace would expand into chunks
			// of the surrounding document.
			const artifact = source
				.replace(linkTag, () => `<style>${css}</style>`)
				.replace(scriptTag, () => `<script type="module">${js}</script>`)
				// No preloads here: the artifact's fonts are data URIs inside its own CSS.
				.replace('<!-- $PRELOADED_FONTS -->', '')

			if (artifact.includes('/assets/')) {
				throw new Error(
					'inline render artifact still references /assets/ — it is not self-contained'
				)
			}

			delete bundle[html.fileName]
			delete bundle[chunk.fileName]
			delete bundle[style.fileName]
			this.emitFile({
				type: 'asset',
				fileName: html.fileName.replace(/\.html$/, '-inline.html'),
				source: artifact,
			})
		},
	}
}

// Second build pass: the thumbnail render entry as a single self-contained artifact, for the
// worker's html-mode captures. One chunk, no code splitting, every asset — fonts included — as a
// data URI, so the page needs no origin at all: Browser Run receives the whole document in the
// request and the browser fetches nothing. Emits only the artifact, into the main build's output
// beside the files it ships with (scripts/build.ts runs this after the main pass).
export default async (env: { mode: string; command: 'build' | 'serve' }) => {
	const resolved = typeof baseConfig === 'function' ? await baseConfig(env as any) : baseConfig
	return mergeConfig(resolved, {
		plugins: [emptyTranslationsPlugin(), inlineRenderEntryPlugin()],
		build: {
			outDir: 'dist',
			emptyOutDir: false,
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
