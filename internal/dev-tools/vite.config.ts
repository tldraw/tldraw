import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	root: path.join(__dirname, 'src'),
	server: {
		port: 4000,
	},
})
