import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const entry = resolve(root, 'src/index.ts')
const outfile = resolve(root, 'dist/index.js')

if (!existsSync(entry)) {
	process.stderr.write(
		`tldraw-tui build: ${entry} does not exist yet, nothing to bundle (the CLI entry lands with the App wiring).\n`
	)
	process.exit(0)
}

const start = performance.now()
// jsdom stays external: it is CommonJS with dynamic requires that esbuild cannot bundle, and it
// resolves from node_modules at runtime. NODE_ENV must be "production" (never "test"): tldraw's
// TickManager and FpsScheduler switch to unthrottled test paths under "test".
await build({
	entryPoints: [entry],
	outfile,
	bundle: true,
	platform: 'node',
	format: 'esm',
	target: 'node22',
	external: ['jsdom'],
	define: { 'process.env.NODE_ENV': '"production"' },
	loader: { '.css': 'empty' },
	logLevel: 'warning',
})
process.stdout.write(
	`tldraw-tui build: wrote ${outfile} in ${Math.round(performance.now() - start)} ms\n`
)
