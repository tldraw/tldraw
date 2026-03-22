import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
	plugins: [react(), viteSingleFile()],
	root: 'src/widget',
	envDir: '../..',
	build: {
		outDir: '../../dist',
		emptyOutDir: false,
	},
})
