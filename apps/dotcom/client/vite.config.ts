import react from '@vitejs/plugin-react-swc'
import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig, Plugin } from 'vite'
import { zodLocalePlugin } from './scripts/vite-zod-locale-plugin.js'

config({
	path: './.env.local',
})

/**
 * Plugin to enable SPA fallback for vite preview.
 * In dev mode, Vite handles SPA routing automatically.
 * In preview mode, we need to rewrite page-like URLs to /index.html
 * so the static file server (sirv) serves the SPA entry point.
 */
function spaFallbackPlugin(): Plugin {
	return {
		name: 'spa-fallback',
		configurePreviewServer(server) {
			// This runs BEFORE the static file server (sirv) is added
			server.middlewares.use((req, res, next) => {
				const url = req.url || '/'
				const pathname = url.split('?')[0]
				const ext = path.extname(pathname)

				// If this looks like a page request (no file extension, not an api call),
				// rewrite to index.html so sirv serves the SPA
				if (!pathname.startsWith('/api') && !ext) {
					req.url = '/index.html' + (url.includes('?') ? url.substring(url.indexOf('?')) : '')
				}
				next()
			})
		},
	}
}

export function getMultiplayerServerURL() {
	return process.env.MULTIPLAYER_SERVER?.replace(/^ws/, 'http')
}

function urlOrLocalFallback(mode: string, url: string | undefined, localFallbackPort: number) {
	if (url) {
		return JSON.stringify(url)
	}

	if (mode === 'development') {
		// in dev, vite lets us inline javascript expressions - so we return a template string that
		// will be evaluated on the client
		return '`http://${location.hostname}:' + localFallbackPort + '`'
	} else {
		// in production, we have to fall back to a hardcoded value
		return JSON.stringify(`http://localhost:${localFallbackPort}`)
	}
}

// https://vitejs.dev/config/
export default defineConfig((env) => ({
	plugins: [
		spaFallbackPlugin(),
		zodLocalePlugin(fileURLToPath(new URL('./scripts/zod-locales-shim.js', import.meta.url))),
		react({
			tsDecorators: true,
			plugins: [
				[
					'@swc/plugin-formatjs',
					{
						idInterpolationPattern: '[md5:contenthash:hex:10]',
						additionalComponentNames: ['F'],
						ast: true,
					},
				],
			],
		}),
	],
	publicDir: './public',
	resolve: {
		alias: {
			'@formatjs/icu-messageformat-parser': '@formatjs/icu-messageformat-parser/no-parser.js',
		},
	},
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
		'process.env.MULTIPLAYER_SERVER': urlOrLocalFallback(env.mode, getMultiplayerServerURL(), 8787),
		'process.env.ZERO_SERVER': urlOrLocalFallback(env.mode, process.env.ZERO_SERVER, 4848),
		'process.env.USER_CONTENT_URL': urlOrLocalFallback(
			env.mode,
			process.env.USER_CONTENT_URL,
			8789
		),
		'process.env.TLDRAW_ENV': JSON.stringify(process.env.TLDRAW_ENV ?? 'development'),
		'process.env.TLDRAW_LICENSE': JSON.stringify(process.env.TLDRAW_LICENSE ?? ''),
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
				target: getMultiplayerServerURL() || 'http://127.0.0.1:8787',
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
		watch: {
			ignored: ['**/playwright-report/**', '**/test-results/**'],
		},
	},
	preview: {
		proxy: {
			'/api': {
				target: getMultiplayerServerURL() || 'http://127.0.0.1:8787',
				rewrite: (path) => path.replace(/^\/api/, ''),
			},
		},
	},
	css: {
		modules: {
			scopeBehaviour: 'local',
			exportGlobals: true,
			localsConvention: 'camelCase',
		},
	},
}))
