import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
	// plugins: [
	// 	reactPlugin({
	// 		babel: { plugins: [['@vitejs/plugin-react-swc', { version: 'legacy' }]] },
	// 	}),
	// ],
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
})
