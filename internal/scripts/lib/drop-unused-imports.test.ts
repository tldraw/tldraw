import { dropUnusedImports } from './drop-unused-imports'

describe('dropUnusedImports', () => {
	it('drops an import whose only uses were trimmed from the rollup', () => {
		const dts = [
			"import { Editor } from '@tldraw/core';",
			"import { LicenseManager } from '@tldraw/core';",
			'',
			'/* Excluded from this release type: LicenseManager */',
			'',
			'export declare function useEditor(): Editor;',
			'',
			'/* Excluded from this release type: useLicenseContext */',
			'',
		].join('\n')

		expect(dropUnusedImports(dts)).toBe(
			[
				"import { Editor } from '@tldraw/core';",
				'',
				'/* Excluded from this release type: LicenseManager */',
				'',
				'export declare function useEditor(): Editor;',
				'',
				'/* Excluded from this release type: useLicenseContext */',
				'',
			].join('\n')
		)
	})

	it('keeps an import that a declaration or a re-export uses', () => {
		const dts = [
			"import { Box } from '@tldraw/core';",
			"import { TLShape } from '@tldraw/tlschema';",
			"import { Vec as Vec_2 } from '@tldraw/core';",
			'',
			'export { TLShape }',
			'',
			'export declare function getBounds(v: Vec_2): Box;',
			'',
		].join('\n')

		expect(dropUnusedImports(dts)).toBe(dts)
	})

	it('does not count a longer name that contains the imported one as a use', () => {
		const dts = [
			"import { Box } from '@tldraw/core';",
			'',
			'export declare function getBoxLike(): BoxLike;',
			'',
		].join('\n')

		expect(dropUnusedImports(dts)).toBe(
			['', 'export declare function getBoxLike(): BoxLike;', ''].join('\n')
		)
	})
})
