import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

const mcpAppSrc = path.resolve(__dirname, '../tldraw-mcp-app/src')

export default defineConfig({
	plugins: [react(), viteSingleFile()],
	root: 'src/widget',
	resolve: {
		alias: {
			'../focused-shape': path.join(mcpAppSrc, 'focused-shape'),
			'../parse-json': path.join(mcpAppSrc, 'parse-json'),
		},
	},
	build: {
		outDir: '../../dist',
		emptyOutDir: false,
	},
})
