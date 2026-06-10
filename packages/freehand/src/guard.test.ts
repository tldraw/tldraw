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

// The vendored Vec is trimmed to just the members the package uses, but every
// line it keeps must still be a verbatim copy. Check that the copy's non-empty
// lines appear in the editor source in the same order, i.e. the copy is the
// editor file with whole members deleted and nothing edited.
function expectOrderedSubsetOfSource(copyPath: string, sourcePath: string) {
	const copy = normalize(readFileSync(join(here, copyPath), 'utf-8'))
	const sourceLines = normalize(readFileSync(join(repoRoot, sourcePath), 'utf-8')).split('\n')
	let cursor = 0
	for (const line of copy.split('\n')) {
		if (line.trim() === '') continue
		const found = sourceLines.indexOf(line, cursor)
		expect(
			found,
			`${copyPath} line must appear in ${sourcePath} (in order): ${JSON.stringify(line)}`
		).toBeGreaterThanOrEqual(0)
		cursor = found + 1
	}
}

describe('vendored primitives match the live editor sources', () => {
	it('vendor/easings.ts', () => {
		expectSameSource('vendor/easings.ts', 'packages/editor/src/lib/primitives/easings.ts')
	})

	it('vendor/Vec.ts', () => {
		expectOrderedSubsetOfSource('vendor/Vec.ts', 'packages/editor/src/lib/primitives/Vec.ts')
	})
})
