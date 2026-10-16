#!/usr/bin/env node
import { existsSync } from 'node:fs'
import module from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// The bundle is ~5 MB of JavaScript; the V8 compile cache cuts startup by roughly 200 ms.
module.enableCompileCache?.()

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/index.js')
if (!existsSync(dist)) {
	process.stderr.write('tldraw-tui: dist/index.js not found. Run pnpm build first.\n')
	process.exit(1)
}

await import(pathToFileURL(dist).href)
