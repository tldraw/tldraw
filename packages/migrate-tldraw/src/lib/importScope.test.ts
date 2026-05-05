import { describe, expect, it } from 'vitest'
import { importsAnyOf, scanImports, symbolImportedFrom } from './importScope'

describe('scanImports', () => {
	it('handles named, default, and namespace imports', () => {
		const src = `
			import Foo from 'a'
			import { Bar, Baz as Qux } from 'b'
			import * as ns from 'c'
			import Default, { Named } from 'd'
			import Default2, * as ns2 from 'e'
		`
		const out = scanImports(src)
		expect([...out.specifiers].sort()).toEqual(['a', 'b', 'c', 'd', 'e'])
		expect([...out.symbols].sort()).toEqual([
			'Bar',
			'Default',
			'Default2',
			'Foo',
			'Named',
			'Qux',
			'ns',
			'ns2',
		])
		expect(out.symbolToSpecifier.get('Qux')).toBe('b')
		expect(out.symbolToSpecifier.get('Default2')).toBe('e')
	})

	it('handles type-only imports', () => {
		const src = `import type { Foo } from 'a'\nimport { type Bar, Baz } from 'b'`
		const out = scanImports(src)
		expect([...out.symbols].sort()).toEqual(['Bar', 'Baz', 'Foo'])
	})

	it('handles require destructuring', () => {
		const src = `const { Foo, Bar } = require('a')`
		const out = scanImports(src)
		expect(out.specifiers.has('a')).toBe(true)
		expect(out.symbolToSpecifier.get('Foo')).toBe('a')
	})
})

describe('importsAnyOf', () => {
	it('matches scope prefix imports', () => {
		const src = `import { useSpecial } from '@tldraw/editor'`
		const imports = scanImports(src)
		expect(importsAnyOf(imports, ['@tldraw/editor'])).toBe(true)
		expect(importsAnyOf(imports, ['tldraw'])).toBe(false)
	})

	it('matches subpath imports of an exact package', () => {
		const src = `import x from '@tldraw/editor/foo'`
		const imports = scanImports(src)
		expect(importsAnyOf(imports, ['@tldraw/editor'])).toBe(true)
	})
})

describe('symbolImportedFrom', () => {
	it('only fires when the symbol came from one of the listed packages', () => {
		const src = `import { useSpecial } from 'tldraw'`
		const imports = scanImports(src)
		expect(symbolImportedFrom(imports, 'useSpecial', ['tldraw'])).toBe(true)
		expect(symbolImportedFrom(imports, 'useSpecial', ['unrelated'])).toBe(false)
		expect(symbolImportedFrom(imports, 'notImported', ['tldraw'])).toBe(false)
	})
})
