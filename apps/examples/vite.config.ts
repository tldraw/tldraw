import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { PluginOption, defineConfig } from 'vite'

export default defineConfig({
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
	},
})

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
				`export const description = ${JSON.stringify(description)};`,
				`export const details = ${JSON.stringify(details)};`,
				`export const codeUrl = ${JSON.stringify(codeUrl)};`,
				`export const path = ${JSON.stringify(path)};`,
				`export const componentFile = ${JSON.stringify(frontmatter.component)};`,
				`import {lazy} from 'react';`,
				`export const loadComponent = async () => {`,
				`    return (await import(${JSON.stringify(frontmatter.component)})).default;`,
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

	const category = 'category' in data ? data.category : null
	if (typeof category !== 'string') {
		throw new Error(`Frontmatter key 'category' must be string in ${fileName}`)
	}

	const hide = 'hide' in data ? data.hide : false
	if (hide !== false && hide !== true) {
		throw new Error(`Frontmatter key 'hide' must be boolean in ${fileName}`)
	}

	return {
		title: data.title,
		component: data.component,
		priority,
		category,
		hide,
	}
}
