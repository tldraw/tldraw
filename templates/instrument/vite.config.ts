import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	// Load env from this template's directory, not the repo root
	const env = loadEnv(mode, path.dirname(new URL(import.meta.url).pathname), '')

	return {
		plugins: [react({ tsDecorators: true })],
		server: {
			proxy: {
				'/api/anthropic': {
					target: 'https://api.anthropic.com/v1',
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
					configure: (proxy) => {
						proxy.on('proxyReq', (proxyReq, req) => {
							console.log('[Proxy] Request to Anthropic:', req.url)
							console.log('[Proxy] API key present:', !!env.ANTHROPIC_API_KEY)
							// Remove browser-identifying headers
							proxyReq.removeHeader('origin')
							proxyReq.removeHeader('referer')
							// Add Anthropic API headers
							proxyReq.setHeader('x-api-key', env.ANTHROPIC_API_KEY || '')
							proxyReq.setHeader('anthropic-version', '2023-06-01')
						})
						proxy.on('proxyRes', (proxyRes, req) => {
							console.log('[Proxy] Response from Anthropic:', proxyRes.statusCode, req.url)
						})
						proxy.on('error', (err, req) => {
							console.error('[Proxy] Error:', err.message, req.url)
						})
					},
				},
			},
		},
	}
})
