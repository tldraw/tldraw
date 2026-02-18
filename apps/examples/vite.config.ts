import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { Plugin, PluginOption, defineConfig } from 'vite'

/**
 * Plugin to enable SPA fallback for vite preview.
 * In dev mode, Vite handles SPA routing automatically.
 * In preview mode, we need to rewrite page-like URLs to /index.html
 * so the static file server (sirv) serves the SPA entry point.
 */
function spaFallbackPlugin(): Plugin {
	return {
		name: 'spa-fallback',
		configurePreviewServer(server) {
			server.middlewares.use((req, res, next) => {
				const url = req.url || '/'
				const pathname = url.split('?')[0]
				const ext = path.extname(pathname)

				// If this looks like a page request (no file extension),
				// rewrite to index.html so sirv serves the SPA
				if (!ext) {
					req.url = '/index.html' + (url.includes('?') ? url.substring(url.indexOf('?')) : '')
				}
				next()
			})
		},
	}
}

const PR_NUMBER = process.env.VERCEL_GIT_PULL_REQUEST_ID

function getEnv() {
	if (!process.env.VERCEL_ENV) {
		return 'development'
	}
	if (PR_NUMBER !== undefined && PR_NUMBER !== '') {
		return 'preview'
	}
	if (process.env.VERCEL_ENV === 'production') {
		return 'production'
	}
	return 'canary'
}

const env = getEnv()

// eslint-disable-next-line no-console
console.log('build env:', env)

function urlOrLocalFallback(mode: string, url: string | undefined, localFallbackPort: number) {
	if (url) {
		return JSON.stringify(url)
	}

	if (mode === 'development') {
		// in dev, vite lets us inline javascript expressions - so we return a template string that
		// will be evaluated on the client
		return '`http://${location.hostname}:' + localFallbackPort + '`'
	} else {
		// in production, we have to fall back to a hardcoded value
		return JSON.stringify(`http://localhost:${localFallbackPort}`)
	}
}

const TLDRAW_BEMO_URL_STRING =
	env === 'production'
		? 'https://demo.tldraw.xyz'
		: env === 'canary'
			? 'https://canary-demo.tldraw.xyz'
			: PR_NUMBER
				? `https://pr-${PR_NUMBER}-demo.tldraw.xyz`
				: undefined

export default defineConfig(({ mode }) => ({
	plugins: [spaFallbackPlugin(), react({ tsDecorators: true }), exampleReadmePlugin()],
	root: path.join(__dirname, 'src'),
	publicDir: path.join(__dirname, 'public'),
	build: {
		outDir: path.join(__dirname, 'dist'),
		assetsInlineLimit: 0,
		target: 'es2022',
		minify: false,
	},
	esbuild: {
		target: 'es2022',
	},
	server: {
		port: 5420,
		allowedHosts: true,
	},
	preview: {
		port: 5420,
	},
	clearScreen: false,
	optimizeDeps: {
		exclude: ['@tldraw/assets'],
		esbuildOptions: {
			target: 'es2022',
		},
	},
	define: {
		'process.env.TLDRAW_ENV': JSON.stringify(process.env.VERCEL_ENV ?? 'development'),
		'process.env.TLDRAW_DEPLOY_ID': JSON.stringify(
			process.env.VERCEL_GIT_COMMIT_SHA ?? `local-${Date.now()}`
		),
		'process.env.TLDRAW_BEMO_URL': urlOrLocalFallback(mode, TLDRAW_BEMO_URL_STRING, 8989),
		'process.env.TLDRAW_IMAGE_URL': urlOrLocalFallback(
			mode,
			env === 'development' ? undefined : 'https://images.tldraw.xyz',
			8786
		),
	},
}))

function exampleReadmePlugin(): PluginOption {
	return {
		name: 'example-readme',
		async transform(src, id) {
			const [filePath, query] = id.split('?')
			const isContentQuery = query?.split('&').includes('content')
			const match = filePath.match(/examples\/src\/examples\/(.+)\/README.md$/)
			if (!match) return

			const separator = '\n<hr>\n'
			const relativePath = match[1]
			const segments = relativePath.split('/')
			const slug = segments[segments.length - 1]
			const category = segments.slice(0, -1).join('/')
			if (!category) {
				throw new Error(`Example category folder missing for ${filePath}`)
			}
			const path = `/${slug}`
			const codeUrl = `https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/${relativePath}`

			if (isContentQuery) {
				const remark = (await import('remark')).remark
				const remarkFrontmatter = (await import('remark-frontmatter')).default
				const remarkHtml = (await import('remark-html')).default
				const matter = (await import('vfile-matter')).matter

				const file = await remark()
					.use(remarkFrontmatter)
					.use(remarkHtml)
					.use(() => (_, file) => matter(file))
					.process(src)

				const parts = String(file).split(separator)
				const description = parts[0]
				const details = parts.slice(1).join(separator)

				const result = [
					`export const description = ${JSON.stringify(description)};`,
					`export const details = ${JSON.stringify(details)};`,
				]

				return result.join('\n')
			}

			const remark = (await import('remark')).remark
			const remarkFrontmatter = (await import('remark-frontmatter')).default
			const matter = (await import('vfile-matter')).matter

			const file = await remark()
				.use(remarkFrontmatter)
				.use(() => (_, file) => matter(file))
				.process(src)

			const frontmatter = parseFrontMatter(file.data.matter, filePath)

			const meta = {
				title: frontmatter.title,
				priority: frontmatter.priority,
				category,
				multiplayer: frontmatter.multiplayer,
				keywords: frontmatter.keywords,
				codeUrl,
				path,
			}

			const result = [
				`export const meta = ${JSON.stringify(meta)};`,
				`export const loadComponent = async () => {`,
				`    return (await import(${JSON.stringify(frontmatter.component)})).default;`,
				`};`,
				`export const loadContent = async () => {`,
				`    return await import(${JSON.stringify(filePath + '?content')});`,
				`};`,
			]

			return result.join('\n')
		},
	}
}

function parseFrontMatter(data: unknown, fileName: string) {
	if (!data || typeof data !== 'object') {
		throw new Error(`Frontmatter missing in ${fileName}`)
	}

	if (!('title' in data && typeof data.title === 'string')) {
		throw new Error(`Frontmatter key 'title' must be string in ${fileName}`)
	}

	if (!('component' in data && typeof data.component === 'string')) {
		throw new Error(`Frontmatter key 'component' must be string in ${fileName}`)
	}

	const priority = 'priority' in data ? data.priority : 999999
	if (typeof priority !== 'number') {
		throw new Error(`Frontmatter key 'priority' must be number in ${fileName}`)
	}

	const keywords = 'keywords' in data ? data.keywords : []
	if (!Array.isArray(keywords)) {
		throw new Error(`Frontmatter key 'keywords' must be array in ${fileName}`)
	}

	const multiplayer = 'multiplayer' in data ? data.multiplayer : false
	if (typeof multiplayer !== 'boolean') {
		throw new Error(`Frontmatter key 'multiplayer' must be boolean in ${fileName}`)
	}

	return {
		title: data.title,
		component: data.component,
		priority,
		keywords,
		multiplayer,
	}
}
