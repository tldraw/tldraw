import { renameSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import react from '@vitejs/plugin-react'
import { defineConfig, Plugin } from 'vite'
import { thumbnailRenderCsp } from '../client/src/utils/csp'

// Builds the render page into the directory this worker serves as static assets (see `[assets]` in
// wrangler.toml), so the page deploys with the worker that drives it. The source is the client's
// thumbnail-render entry: the app's shape utils and stylesheet are what the page has to draw with.

const client = fileURLToPath(new URL('../client', import.meta.url))
const outDir = fileURLToPath(new URL('./.page', import.meta.url))
const entry = 'thumbnail-render.html'
// Mirrors THUMBNAIL_RENDER_PATH, which this config cannot import: @tldraw/dotcom-shared is TypeScript
// source, and a Vite config loads as plain Node.
const THUMBNAIL_RENDER_PATH = '/__thumbnail-render'

function serveAtRenderPath(): Plugin {
	return {
		name: 'render-page-serve-at-render-path',
		apply: 'build',
		closeBundle() {
			// Workers assets serve `<name>.html` at `/<name>`, so this is what puts the page at the path
			// Browser Run is sent to.
			renameSync(resolve(outDir, entry), resolve(outDir, `.${THUMBNAIL_RENDER_PATH}.html`))
			// The client's policy for this page (see thumbnailRenderCsp): a board's records are untrusted,
			// and this is what stops one loading a script from elsewhere.
			writeFileSync(
				resolve(outDir, '_headers'),
				[
					THUMBNAIL_RENDER_PATH,
					`  Content-Security-Policy: ${thumbnailRenderCsp}`,
					'  X-Robots-Tag: noindex',
					'  X-Content-Type-Options: nosniff',
					'',
				].join('\n')
			)
		},
	}
}

const tldrawEnv = process.env.TLDRAW_ENV ?? 'development'

function required(name: string, developmentFallback: string) {
	const value = process.env[name]
	if (value) return value
	if (tldrawEnv === 'development') return developmentFallback
	throw new Error(`${name} must be set to build the render page`)
}

export default defineConfig({
	root: client,
	publicDir: false,
	plugins: [react(), serveAtRenderPath()],
	define: {
		'process.env.TLDRAW_ENV': JSON.stringify(tldrawEnv),
		// Where the page loads a board's images from.
		'process.env.USER_CONTENT_URL': JSON.stringify(
			required('USER_CONTENT_URL', 'http://localhost:8789')
		),
		// Read at import by the client's config module; the page never connects to either.
		'process.env.MULTIPLAYER_SERVER': JSON.stringify('http://localhost'),
		'process.env.ZERO_SERVER': JSON.stringify('http://localhost'),
	},
	build: {
		outDir,
		emptyOutDir: true,
		// Under the render path, so the one route that sends the page to this worker carries its assets
		// too (see the routes in wrangler.toml).
		assetsDir: `${THUMBNAIL_RENDER_PATH.slice(1)}/assets`,
		// our svg icons break if we use data urls (as in the client's own build)
		assetsInlineLimit: 0,
		rollupOptions: { input: resolve(client, entry) },
	},
})
