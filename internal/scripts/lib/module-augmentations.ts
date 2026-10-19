import { appendFileSync, existsSync, readFileSync } from 'fs'
import path from 'path'
import { namedTypes } from 'ast-types'
import { glob } from 'glob'
import { parse, print } from 'recast'

/**
 * api-extractor drops `declare module '…'` blocks from its rollups, so a package registering a shape
 * type through `TLGlobalShapePropsMap` would publish typings that no longer know it. Copy the ones
 * augmenting tldraw's own modules back onto the end of each rollup. Others stay out: editor's
 * `declare module 'react'` narrows `id` to `SafeId`, and would break consumers' own `id` props.
 */
export function restoreModuleAugmentations(tsbuildDir: string, rollupFiles: string[]) {
	const blocks: string[] = []
	// Tests register throwaway shapes this way too, and those mustn't ship.
	const files = glob.sync(path.join(tsbuildDir, '**/*.d.ts'), {
		ignore: ['**/*.test.d.ts', '**/*.spec.d.ts', '**/test/**', '**/__tests__/**'],
	})
	// Incremental builds leave a deleted or renamed source's output behind, with a block naming
	// exports the rollup no longer has.
	const srcDir = path.join(path.dirname(tsbuildDir), 'src')
	const hasSource = (file: string) => {
		const stem = path.join(srcDir, path.relative(tsbuildDir, file).replace(/\.d\.ts$/, ''))
		return existsSync(`${stem}.ts`) || existsSync(`${stem}.tsx`)
	}
	for (const file of files.filter(hasSource).sort()) {
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
	if (!namedTypes.StringLiteral.check(statement.id)) return false
	const name = statement.id.value
	return name === 'tldraw' || name.startsWith('@tldraw/')
}
