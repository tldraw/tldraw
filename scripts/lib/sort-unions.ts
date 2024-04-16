import { namedTypes } from 'ast-types'
import { readFileSync, writeFileSync } from 'fs'
import glob from 'glob'
import path from 'path'
import { parse, print, visit } from 'recast'

export function sortUnions(tsbuildDir: string) {
	for (const file of glob.sync(path.join(tsbuildDir, '**/*.d.ts'))) {
		const code = parse(readFileSync(file, 'utf8'), { parser: require('recast/parsers/typescript') })

		visit(code, {
			visitTSUnionType(path) {
				this.traverse(path)
				const val = path.value as namedTypes.TSUnionType
				val.types = val.types.sort((a, b) => {
					const aText = print(a).code
					const bText = print(b).code
					return aText.localeCompare(bText)
				})
				return false
			},
		})

		writeFileSync(file, print(code).code)
	}
}
