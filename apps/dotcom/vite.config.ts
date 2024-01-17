import react from '@vitejs/plugin-react-swc'
import { config } from 'dotenv'
import { defineConfig } from 'vite'
import { VitePWA, VitePWAOptions } from 'vite-plugin-pwa'

config({
	path: './.env.local',
})

export const getMultiplayerServerURL = () => {
	return process.env.MULTIPLAYER_SERVER?.replace(/^ws/, 'http') ?? 'http://127.0.0.1:8787'
}

const pwaConfig: Partial<VitePWAOptions> = {
	registerType: 'autoUpdate',
	// Make sure the service worker doesn't try to handle API requests
	workbox: {
		navigateFallbackDenylist: [/^\/api/],
		runtimeCaching: [{ handler: 'NetworkFirst', urlPattern: /\/.*/ }],
	},
	// Uncomment this to test the PWA install flow locally
	// devOptions: { enabled: true },
	manifest: {
		name: 'tldraw',
		short_name: 'tldraw',
		description: 'a very good free whiteboard',

		icons: [
			{
				src: '/android-chrome-512x512.png',
				sizes: '512x512',
				type: 'image/png',
				purpose: 'any',
			},
			{
				src: '/android-chrome-maskable-512x512.png',
				sizes: '512x512',
				type: 'image/png',
				purpose: 'any maskable',
			},
			{
				src: '/android-chrome-192x192.png',
				sizes: '192x192',
				type: 'image/png',
				purpose: 'any',
			},
			{
				src: '/android-chrome-maskable-192x192.png',
				sizes: '192x192',
				type: 'image/png',
				purpose: 'any maskable',
			},
		],
		theme_color: '#ffffff',
		background_color: '#ffffff',
		start_url: '/',
		display: 'standalone',
		orientation: 'any',
	},
}

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react({ tsDecorators: true }), VitePWA(pwaConfig)],
	publicDir: './public',
	build: {
		// output source maps to .map files and include //sourceMappingURL comments in JavaScript files
		// these get uploaded to Sentry and can be used for debugging
		sourcemap: true,

		// our svg icons break if we use data urls, so disable inline assets for now
		assetsInlineLimit: 0,
	},
	// add backwards-compatible support for NEXT_PUBLIC_ env vars
	define: {
		...Object.fromEntries(
			Object.entries(process.env)
				.filter(([key]) => key.startsWith('NEXT_PUBLIC_'))
				.map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)])
		),
		'process.env.MULTIPLAYER_SERVER': JSON.stringify(getMultiplayerServerURL()),
		'process.env.ASSET_UPLOAD': JSON.stringify(process.env.ASSET_UPLOAD ?? 'http://127.0.0.1:8788'),
		'process.env.TLDRAW_ENV': JSON.stringify(process.env.TLDRAW_ENV ?? 'development'),
		// Fall back to staging DSN for local develeopment, although you still need to
		// modify the env check in 'sentry.client.config.ts' to get it reporting errors
		'process.env.SENTRY_DSN': JSON.stringify(
			process.env.SENTRY_DSN ??
				'https://4adc43773d07854d8a60e119505182cc@o578706.ingest.sentry.io/4506178821881856'
		),
	},
	server: {
		proxy: {
			'/api': {
				target: getMultiplayerServerURL(),
				rewrite: (path) => path.replace(/^\/api/, ''),
				ws: false, // we talk to the websocket directly via workers.dev
				// Useful for debugging proxy issues
				// configure: (proxy, _options) => {
				// 	proxy.on('error', (err, _req, _res) => {
				// 		console.log('[proxy] proxy error', err)
				// 	})
				// 	proxy.on('proxyReq', (proxyReq, req, _res) => {
				// 		console.log('[proxy] Sending Request to the Target:', req.method, req.url)
				// 	})
				// 	proxy.on('proxyRes', (proxyRes, req, _res) => {
				// 		console.log(
				// 			'[proxy] Received Response from the Target:',
				// 			proxyRes.statusCode,
				// 			req.url
				// 		)
				// 	})
				// },
			},
		},
	},
})
