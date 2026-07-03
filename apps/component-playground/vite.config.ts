import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// No `resolve.alias` and no custom conditions are needed: each SDK package's
// package.json points `main`/`exports` at `./src/index.ts` in dev, so importing
// `tldraw` resolves through the workspace symlink straight to source, with HMR.
export default defineConfig({
	plugins: [react()],
	root: path.join(__dirname, 'src'),
	build: {
		rollupOptions: {
			// Two HTML entries: the studio shell and the sketch preview it iframes.
			input: {
				index: path.join(__dirname, 'src/index.html'),
				sketch: path.join(__dirname, 'src/sketch.html'),
			},
		},
	},
	server: {
		port: 5430,
		allowedHosts: true,
	},
	preview: {
		port: 5430,
	},
	clearScreen: false,
})
