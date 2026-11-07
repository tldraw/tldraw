import type { HtmlTagDescriptor, Plugin, Rollup } from 'vite'

const ENTRY_FORBIDDEN_MODULES = /\/packages\/(tldraw|editor|sync-core|store|tlschema)\/src\//

// Route chunks are lazy, so without hints the browser only discovers them once the entry chunk has
// downloaded and run, a serial round trip before any app code.
export function routePreloadPlugin(routeModules: string[]): Plugin {
	return {
		name: 'route-preload',
		apply: 'build',
		transformIndexHtml: {
			order: 'post',
			handler(_html, { bundle, chunk: entryChunk, filename }) {
				if (!bundle || !entryChunk || !filename.endsWith('/index.html')) return

				const chunks = new Map<string, Rollup.OutputChunk>()
				for (const output of Object.values(bundle)) {
					if (output.type === 'chunk') chunks.set(output.fileName, output)
				}

				const collect = (fileName: string, into: Set<string>) => {
					if (into.has(fileName)) return
					into.add(fileName)
					for (const imported of chunks.get(fileName)?.imports ?? []) collect(imported, into)
				}

				const entryGraph = new Set<string>()
				collect(entryChunk.fileName, entryGraph)

				// One barrel import of the SDK here puts the whole editor back in front of first paint
				// (tldraw-internal#2034).
				for (const fileName of entryGraph) {
					const sdkModule = chunks
						.get(fileName)
						?.moduleIds.find((id) => ENTRY_FORBIDDEN_MODULES.test(id))
					if (sdkModule) {
						throw new Error(`route-preload: ${sdkModule} is in the entry chunk graph`)
					}
				}

				const preload = new Set<string>()
				for (const moduleId of routeModules) {
					const routeChunk = [...chunks.values()].find((c) => c.facadeModuleId === moduleId)
					if (!routeChunk) throw new Error(`route-preload: no chunk for ${moduleId}`)
					collect(routeChunk.fileName, preload)
				}

				const tags: HtmlTagDescriptor[] = []
				const css = new Set<string>()
				for (const fileName of preload) {
					if (entryGraph.has(fileName)) continue
					tags.push({
						tag: 'link',
						attrs: { rel: 'modulepreload', crossorigin: true, href: '/' + fileName },
						injectTo: 'head',
					})
					for (const cssFile of chunks.get(fileName)?.viteMetadata?.importedCss ?? []) {
						css.add(cssFile)
					}
				}
				for (const cssFile of css) {
					tags.push({
						tag: 'link',
						attrs: { rel: 'preload', as: 'style', crossorigin: true, href: '/' + cssFile },
						injectTo: 'head',
					})
				}
				return tags
			},
		},
	}
}
