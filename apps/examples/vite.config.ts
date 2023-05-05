import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
	root: path.join(__dirname, 'src'),
	publicDir: path.join(__dirname, 'public'),
	resolve: {
		alias: [
			{
				find: '@tldraw/',
				replacement: path.resolve(__dirname, '../packages/'),
			},
		],
	},
	build: {
		outDir: path.join(__dirname, 'dist'),
		assetsInlineLimit: 0,
	},
	server: {
		port: 5420,
	},
	clearScreen: false,
})
