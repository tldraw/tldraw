import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..', '..')

// The baseline and vendor files are verbatim copies of these sources, except
// that their import specifiers point at the vendored primitives. Normalizing
// the specifiers lets us assert that everything else is byte-identical, so
// the baseline can't silently drift from what actually ships in tldraw.
function normalize(source: string) {
	return source.replace(/from '[^']+'/g, "from '#'")
}

function expectSameSource(copyPath: string, sourcePath: string) {
	const copy = readFileSync(join(here, copyPath), 'utf-8')
	const source = readFileSync(join(repoRoot, sourcePath), 'utf-8')
	expect(normalize(copy), `${copyPath} must match ${sourcePath}`).toBe(normalize(source))
}

const TLDRAW_FREEHAND = 'packages/tldraw/src/lib/shapes/shared/freehand'

describe('baseline copies match the live tldraw sources', () => {
	it.each([
		'getStroke.ts',
		'getStrokeOutlinePoints.ts',
		'getStrokePoints.ts',
		'setStrokePointRadii.ts',
		'svg.ts',
		'svgInk.ts',
		'types.ts',
	])('%s', (file) => {
		expectSameSource(join('baseline', file), join(TLDRAW_FREEHAND, file))
	})
})

describe('vendored primitives match the live editor sources', () => {
	it.each([
		['vendor/Vec.ts', 'packages/editor/src/lib/primitives/Vec.ts'],
		['vendor/easings.ts', 'packages/editor/src/lib/primitives/easings.ts'],
	])('%s', (copyPath, sourcePath) => {
		expectSameSource(copyPath, sourcePath)
	})
})
