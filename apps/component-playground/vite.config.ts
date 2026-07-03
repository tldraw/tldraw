import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// No `resolve.alias` and no custom conditions are needed: each SDK package's
// package.json points `main`/`exports` at `./src/index.ts` in dev, so importing
// `tldraw` resolves through the workspace symlink straight to source, with HMR.
export default defineConfig({
	plugins: [react()],
	root: path.join(__dirname, 'src'),
	server: {
		port: 5430,
		allowedHosts: true,
	},
	preview: {
		port: 5430,
	},
	clearScreen: false,
})
