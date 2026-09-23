import type { HtmlTagDescriptor, Plugin, Rollup } from 'vite'

// Route chunks are lazy, so without hints the browser only discovers them once the entry chunk has
// downloaded and run, a serial round trip before any app code. The editor lives in the root
// providers' static graph, so that wave is most of the bytes on every tla route.
export function routePreloadPlugin(routeModules: string[]): Plugin {
	let base = '/'
	return {
		name: 'route-preload',
		apply: 'build',
		configResolved(config) {
			base = config.base
		},
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

				const alreadyLoaded = new Set<string>()
				collect(entryChunk.fileName, alreadyLoaded)

				const preload = new Set<string>()
				for (const moduleId of routeModules) {
					const routeChunk = [...chunks.values()].find((c) => c.facadeModuleId === moduleId)
					if (!routeChunk) throw new Error(`route-preload: no chunk for ${moduleId}`)
					collect(routeChunk.fileName, preload)
				}

				const tags: HtmlTagDescriptor[] = []
				const css = new Set<string>()
				for (const fileName of preload) {
					if (alreadyLoaded.has(fileName)) continue
					tags.push({
						tag: 'link',
						attrs: { rel: 'modulepreload', crossorigin: true, href: base + fileName },
						injectTo: 'head',
					})
					for (const cssFile of chunks.get(fileName)?.viteMetadata?.importedCss ?? []) {
						css.add(cssFile)
					}
				}
				for (const cssFile of css) {
					tags.push({
						tag: 'link',
						attrs: { rel: 'preload', as: 'style', crossorigin: true, href: base + cssFile },
						injectTo: 'head',
					})
				}
				return tags
			},
		},
	}
}
