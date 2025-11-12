import path from 'path'
import { defineConfig } from 'vitest/config'

const svgTransform = {
	name: 'svg-transform',
	transform(_code: string, id: string) {
		if (id.endsWith('.svg')) {
			return {
				code: 'export default {};',
				map: null,
			}
		}
		return undefined
	},
}

export default defineConfig({
	plugins: [svgTransform],
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: [path.resolve(__dirname, './setup.ts')],
		include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
		exclude: [
			'**/test/__fixtures__/**',
			'**/node_modules/**',
			'**/dist/**',
			'**/.tsbuild/**',
			'**/.tsbuild-dev/**',
			'**/.tsbuild-pub/**',
		],
		coverage: {
			include: ['src/**/*.{ts,tsx}'],
			exclude: ['**/*.test.*', '**/*.spec.*', '**/test/**', '**/__tests__/**'],
		},
	},
	resolve: {
		alias: {
			'~': path.resolve(process.cwd(), 'src'),
		},
	},
	ssr: {
		noExternal: ['@tiptap/react'],
	},
})
