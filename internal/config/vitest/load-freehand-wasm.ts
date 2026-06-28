// Freehand generation (draw/highlight/scribble) is backed by a WASM module that loads
// asynchronously via `new URL('./freehand.wasm', import.meta.url)`. That asset resolution
// isn't available in the vitest/jsdom environment, so read the module off disk here and
// inject it before any test runs.
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { instantiateFreehandWasm } from '@tldraw/editor'

const REL = 'packages/editor/src/lib/utils/freehand-wasm/freehand.wasm'

function findWasm(): string {
	let dir = process.cwd()
	for (let i = 0; i < 8; i++) {
		const candidate = resolve(dir, REL)
		if (existsSync(candidate)) return candidate
		dir = resolve(dir, '..')
	}
	throw new Error(`Could not locate ${REL} from ${process.cwd()}`)
}

instantiateFreehandWasm(readFileSync(findWasm()))
