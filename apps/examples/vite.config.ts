import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { PluginOption, defineConfig } from 'vite'

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
	plugins: [react({ tsDecorators: true }), exampleReadmePlugin()],
	root: path.join(__dirname, 'src'),
	publicDir: path.join(__dirname, 'public'),
	build: {
		outDir: path.join(__dirname, 'dist'),
		assetsInlineLimit: 0,
		target: 'es2022',
	},
	esbuild: {
		target: 'es2022',
	},
	server: {
		port: 5420,
		allowedHosts: true,
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
			const match = id.match(/examples\/src\/examples\/(.*)\/README.md$/)
			if (!match) return

			const remark = (await import('remark')).remark
			const remarkFrontmatter = (await import('remark-frontmatter')).default
			const remarkHtml = (await import('remark-html')).default
			const matter = (await import('vfile-matter')).matter

			const file = await remark()
				.use(remarkFrontmatter)
				.use(remarkHtml)
				.use(() => (_, file) => matter(file))
				.process(src)

			const frontmatter = parseFrontMatter(file.data.matter, id)

			const separator = '\n<hr>\n'
			const parts = String(file).split(separator)
			const description = parts[0]
			const details = parts.slice(1).join(separator)
			const path = `/${match[1]}`
			const codeUrl = `https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples${path}`

			const result = [
				`export const title = ${JSON.stringify(frontmatter.title)};`,
				`export const priority = ${JSON.stringify(frontmatter.priority ?? '100000')};`,
				`export const category = ${JSON.stringify(frontmatter.category)};`,
				`export const hide = ${JSON.stringify(frontmatter.hide)};`,
				`export const multiplayer = ${JSON.stringify(frontmatter.multiplayer)};`,
				`export const description = ${JSON.stringify(description)};`,
				`export const details = ${JSON.stringify(details)};`,
				`export const codeUrl = ${JSON.stringify(codeUrl)};`,
				`export const path = ${JSON.stringify(path)};`,
				`export const componentFile = ${JSON.stringify(frontmatter.component)};`,
				`import {lazy} from 'react';`,
				`export const loadComponent = async () => {`,
				`    return (await import(${JSON.stringify(frontmatter.component)})).default;`,
				`};`,
				`export const keywords = ${JSON.stringify(frontmatter.keywords)};`,
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

	const category = 'category' in data ? data.category : null
	if (typeof category !== 'string') {
		throw new Error(`Frontmatter key 'category' must be string in ${fileName}`)
	}

	const hide = 'hide' in data ? data.hide : false
	if (hide !== false && hide !== true) {
		throw new Error(`Frontmatter key 'hide' must be boolean in ${fileName}`)
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
		category,
		hide,
		keywords,
		multiplayer,
	}
}
