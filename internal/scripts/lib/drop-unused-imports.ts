const NAMED_IMPORT = /^import \{ (\w+)(?: as (\w+))? \} from '[^']+';$/
const EXCLUDED_COMMENT = /^\/\* Excluded from this release type: \w+ \*\/$/

/**
 * Removes the imports that a trimmed `.d.ts` rollup no longer uses. API Extractor keeps an import
 * after it trims every declaration that used it. When the import names another package's
 * `@internal` type, that package's trimmed rollup does not export it, and the import fails to
 * resolve.
 */
export function dropUnusedImports(dts: string): string {
	const lines = dts.split('\n')
	const body = lines
		.filter((line) => !NAMED_IMPORT.test(line) && !EXCLUDED_COMMENT.test(line))
		.join('\n')

	return lines
		.filter((line) => {
			const match = line.match(NAMED_IMPORT)
			if (!match) return true
			const localName = match[2] ?? match[1]
			return new RegExp(`\\b${localName}\\b`).test(body)
		})
		.join('\n')
}
