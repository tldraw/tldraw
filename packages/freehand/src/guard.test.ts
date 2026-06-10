import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..', '..')

// The vendor files are verbatim copies of these editor sources, except that
// their import specifiers point at the vendored primitives (and the formatter
// may order them differently). Normalizing the specifiers and sorting the
// import lines lets us assert that everything else is byte-identical, so the
// vendored primitives can't silently drift from the editor's.
function normalize(source: string) {
	const lines = source.replace(/from '[^']+'/g, "from '#'").split('\n')
	const imports: string[] = []
	const rest: string[] = []
	for (const line of lines) {
		;(line.startsWith('import ') ? imports : rest).push(line)
	}
	return [...imports.sort(), ...rest].join('\n')
}

function expectSameSource(copyPath: string, sourcePath: string) {
	const copy = readFileSync(join(here, copyPath), 'utf-8')
	const source = readFileSync(join(repoRoot, sourcePath), 'utf-8')
	expect(normalize(copy), `${copyPath} must match ${sourcePath}`).toBe(normalize(source))
}

describe('vendored primitives match the live editor sources', () => {
	it.each([
		['vendor/Vec.ts', 'packages/editor/src/lib/primitives/Vec.ts'],
		['vendor/easings.ts', 'packages/editor/src/lib/primitives/easings.ts'],
	])('%s', (copyPath, sourcePath) => {
		expectSameSource(copyPath, sourcePath)
	})
})
