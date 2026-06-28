// Build the freehand WASM crate and copy the resulting module into the editor package, where
// it ships as an asset (loaded at runtime via `new URL('./freehand.wasm', import.meta.url)`).
// Run: node freehand-wasm/build.mjs  (from packages/editor)
import { execSync } from 'node:child_process'
import { copyFileSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pkg = resolve(here, '..')

console.log('Building freehand-wasm (release, wasm32-unknown-unknown)...')
execSync('cargo build --release --target wasm32-unknown-unknown', { cwd: here, stdio: 'inherit' })

const wasmPath = resolve(here, 'target/wasm32-unknown-unknown/release/freehand_wasm.wasm')
const out = resolve(pkg, 'src/lib/utils/freehand-wasm/freehand.wasm')
copyFileSync(wasmPath, out)
console.log(`Wrote ${out} (${readFileSync(wasmPath).length} bytes)`)
