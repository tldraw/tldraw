import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig(() => ({
	plugins: [react({ tsDecorators: true })],
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
		port: 5001,
	},
	clearScreen: false,
	optimizeDeps: {
		exclude: ['@tldraw/assets'],
		esbuildOptions: {
			target: 'es2022',
		},
	},
}))
