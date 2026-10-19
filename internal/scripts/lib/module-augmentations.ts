import { appendFileSync, existsSync, readFileSync } from 'fs'
import path from 'path'
import { namedTypes } from 'ast-types'
import { glob } from 'glob'
import { parse, print } from 'recast'

/**
 * api-extractor drops `declare module '…'` and `declare global` blocks from its rollups, so a
 * package registering a shape type through `TLGlobalShapePropsMap` would publish typings that no
 * longer know it. Copy them back onto the end of each rollup.
 */
export function restoreModuleAugmentations(tsbuildDir: string, rollupFiles: string[]) {
	const blocks: string[] = []
	// Tests register throwaway shapes this way too.
	const files = glob.sync(path.join(tsbuildDir, '**/*.d.ts'), {
		ignore: ['**/*.test.d.ts', '**/*.spec.d.ts', '**/test/**', '**/__tests__/**'],
	})
	for (const file of files.sort()) {
		const code = parse(readFileSync(file, 'utf8'), {
			parser: require('recast/parsers/typescript'),
		})
		for (const statement of code.program.body) {
			if (namedTypes.TSModuleDeclaration.check(statement) && isAugmentation(statement)) {
				blocks.push(print(statement).code)
			}
		}
	}
	if (blocks.length === 0) return

	for (const file of rollupFiles) {
		if (!existsSync(file)) continue
		appendFileSync(file, `\n${blocks.join('\n\n')}\n`)
	}
}

function isAugmentation(statement: namedTypes.TSModuleDeclaration) {
	// `declare module 'x' {}` names a string; `declare global {}` is the identifier `global`.
	return (
		namedTypes.StringLiteral.check(statement.id) ||
		(namedTypes.Identifier.check(statement.id) && statement.id.name === 'global')
	)
}
