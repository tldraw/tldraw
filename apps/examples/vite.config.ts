import react from '@vitejs/plugin-react'
import { config } from 'dotenv'
import path from 'path'
import { defineConfig } from 'vite'

config()

export default defineConfig({
	plugins: [react()],
	root: path.join(__dirname, 'src'),
	publicDir: path.join(__dirname, 'public'),
	build: {
		outDir: path.join(__dirname, 'dist'),
		assetsInlineLimit: 0,
	},
	server: {
		port: 5420,
	},
	clearScreen: false,
	optimizeDeps: {
		exclude: ['@tldraw/assets'],
	},
	define: {
		'process.env.TLDRAW_ENV': JSON.stringify(process.env.VERCEL_ENV ?? 'development'),
		'process.env.VITE_OPENAI_API_KEY': JSON.stringify(process.env.VITE_OPENAI_API_KEY),
	},
})
