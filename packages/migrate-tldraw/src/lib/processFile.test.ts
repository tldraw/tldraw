/**
 * Unit tests for the core engine. Focused on tricky scope behavior — fixture
 * tests in `transforms/<id>/__tests__/` cover the end-to-end transform.
 */

import { describe, expect, it } from 'vitest'
import { processSource } from './processFile'
import type { AutoFix, Flag } from './types'

describe('processSource: auto-fixes', () => {
	const fix: AutoFix = {
		kind: 'auto',
		id: 'rename-foo',
		name: 'foo → bar',
		pattern: /\bfoo\b/g,
		replacement: 'bar',
		note: '',
	}

	it('rewrites every occurrence', () => {
		const { updated, result } = processSource('a.ts', 'foo foo notFoo foobar', [fix], [])
		expect(updated).toBe('bar bar notFoo foobar')
		expect(result.fixes).toHaveLength(1)
		expect(result.changed).toBe(true)
	})

	it('does not change a file when no pattern matches', () => {
		const { updated, result } = processSource('a.ts', 'no matches here', [fix], [])
		expect(updated).toBe('no matches here')
		expect(result.changed).toBe(false)
		expect(result.fixes).toHaveLength(0)
	})
})

describe('processSource: scope: identifier', () => {
	const flag: Flag = {
		kind: 'flag',
		id: 'unscoped',
		name: 'unscoped',
		pattern: /\bSPECIAL\b/g,
		scope: 'identifier',
		note: '',
	}

	it('fires anywhere the regex matches', () => {
		const { result } = processSource('a.ts', 'const SPECIAL = 1\nx.SPECIAL', [], [flag])
		expect(result.flags).toHaveLength(2)
	})
})

describe('processSource: scope: import', () => {
	const flag: Flag = {
		kind: 'flag',
		id: 'use-special',
		name: 'useSpecial',
		pattern: /\buseSpecial\b/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/'],
		note: '',
	}

	it('fires on the call site, not the import line', () => {
		const src = `import { useSpecial } from 'tldraw'\nconst x = useSpecial()`
		const { result } = processSource('a.ts', src, [], [flag])
		expect(result.flags).toHaveLength(1)
		expect(result.flags[0].line).toBe(2)
	})

	it('fires when imported from @tldraw/editor', () => {
		const src = `import { useSpecial } from '@tldraw/editor'\nconst x = useSpecial()`
		const { result } = processSource('a.ts', src, [], [flag])
		expect(result.flags).toHaveLength(1)
	})

	it('does not fire when imported from somewhere else', () => {
		const src = `import { useSpecial } from 'unrelated'\nconst x = useSpecial()`
		const { result } = processSource('a.ts', src, [], [flag])
		expect(result.flags).toHaveLength(0)
	})

	it('does not fire when never imported', () => {
		const src = `const useSpecial = () => 1\nconst x = useSpecial()`
		const { result } = processSource('a.ts', src, [], [flag])
		expect(result.flags).toHaveLength(0)
	})

	it('handles renamed imports — keys off the local binding', () => {
		const src = `import { useOther as useSpecial } from 'tldraw'\nuseSpecial()`
		const { result } = processSource('a.ts', src, [], [flag])
		expect(result.flags).toHaveLength(1)
		expect(result.flags[0].line).toBe(2)
	})

	it('handles patterns with trailing punctuation by extracting the leading identifier', () => {
		const callFlag: Flag = {
			kind: 'flag',
			id: 'use-special-call',
			name: 'useSpecial(',
			pattern: /\buseSpecial\s*\(/g,
			scope: 'import',
			importedFrom: ['tldraw'],
			note: '',
		}
		const src = `import { useSpecial } from 'tldraw'\nuseSpecial()`
		const { result } = processSource('a.ts', src, [], [callFlag])
		expect(result.flags).toHaveLength(1)
	})
})

describe('processSource: scope: jsx-components-slot', () => {
	const flag: Flag = {
		kind: 'flag',
		id: 'slot-brush',
		name: 'Brush slot',
		pattern: /\bBrush\s*:/g,
		scope: 'jsx-components-slot',
		note: '',
	}

	it('fires inside <Tldraw components={…}> inline literal', () => {
		const src = `<Tldraw components={{ Brush: MyBrush }} />`
		const { result } = processSource('a.tsx', src, [], [flag])
		expect(result.flags).toHaveLength(1)
	})

	it('fires inside <TldrawEditor components={…}> as well', () => {
		const src = `<TldrawEditor components={{ Brush: MyBrush }} />`
		const { result } = processSource('a.tsx', src, [], [flag])
		expect(result.flags).toHaveLength(1)
	})

	it('does not fire on a same-named key in an unrelated object', () => {
		const src = `const cfg = { Brush: 'unrelated' }\nx.Brush; { Brush: 'no' }`
		const { result } = processSource('a.tsx', src, [], [flag])
		expect(result.flags).toHaveLength(0)
	})

	it('does not fire on a non-Tldraw component', () => {
		const src = `<MyOwnEditor components={{ Brush: MyBrush }} />`
		const { result } = processSource('a.tsx', src, [], [flag])
		expect(result.flags).toHaveLength(0)
	})
})

describe('processSource: scope: member-access', () => {
	const flag: Flag = {
		kind: 'flag',
		id: 'theme-id',
		name: 'themeId',
		pattern: /\bthemeId\b/g,
		scope: 'member-access',
		note: '',
	}

	it('fires only when prefixed with a dot', () => {
		const src = `ctx.themeId === 'dark'\nconst themeId = 'foo'\nlet other = themeId`
		const { result } = processSource('a.ts', src, [], [flag])
		expect(result.flags).toHaveLength(1)
	})
})

describe('processSource: line / col reporting', () => {
	const flag: Flag = {
		kind: 'flag',
		id: 'foo',
		name: 'foo',
		pattern: /\bfoo\b/g,
		scope: 'identifier',
		note: '',
	}

	it('reports 1-indexed line and column on the post-fix source', () => {
		const src = '\n  foo\nfoo'
		const { result } = processSource('a.ts', src, [], [flag])
		expect(result.flags).toEqual([
			expect.objectContaining({ line: 2, col: 3 }),
			expect.objectContaining({ line: 3, col: 1 }),
		])
	})

	it('reports line numbers AFTER auto-fixes are applied', () => {
		const fix: AutoFix = {
			kind: 'auto',
			id: 'add-line',
			name: 'add a line',
			pattern: /^/,
			replacement: '// header\n',
			note: '',
		}
		const src = 'foo\n'
		const { updated, result } = processSource('a.ts', src, [fix], [flag])
		expect(updated).toBe('// header\nfoo\n')
		expect(result.flags[0]).toEqual(expect.objectContaining({ line: 2, col: 1 }))
	})
})
