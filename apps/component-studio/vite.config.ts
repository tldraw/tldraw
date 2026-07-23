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
		// output to the package root (not src/dist), matching the other apps
		outDir: path.join(__dirname, 'dist'),
		emptyOutDir: true,
		rollupOptions: {
			// HTML entries: the studio shell, the sketch preview it iframes, and the
			// canvas view (all sketches laid out on a tldraw canvas).
			input: {
				index: path.join(__dirname, 'src/index.html'),
				sketch: path.join(__dirname, 'src/sketch.html'),
				canvas: path.join(__dirname, 'src/canvas.html'),
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
