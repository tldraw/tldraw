import { existsSync, readFileSync, statSync, writeFileSync } from 'fs'
import glob from 'glob'
import path from 'path'
import { parse, print, visit } from 'recast'

const extensions = ['.js', '.mjs', '.cjs']
function resolveRelativePath(importingFile: string, relativePath: string) {
	if (!relativePath.startsWith('.')) {
		return relativePath
	}

	const containingDir = path.dirname(importingFile)

	if (
		existsSync(path.join(containingDir, relativePath)) &&
		!statSync(path.join(containingDir, relativePath)).isDirectory()
	) {
		// if the file already exists, e.g. .css files, just use it
		return relativePath
	}

	// strip the file extension if applicable
	relativePath.replace(/\.(m|c)?js$/, '')

	for (const extension of extensions) {
		if (relativePath.endsWith(extension)) {
			return relativePath
		} else {
			let candidate = `${relativePath}${extension}`
			if (existsSync(path.join(containingDir, candidate))) {
				return candidate
			}

			candidate = `${relativePath}/index${extension}`

			if (existsSync(path.join(containingDir, candidate))) {
				return candidate
			}
		}
	}

	throw new Error(`Could not resolve relative path ${relativePath} from ${importingFile}`)
}

export function addJsExtensions(distDir: string) {
	for (const file of glob.sync(path.join(distDir, '**/*.{mjs,cjs,js}'))) {
		const code = parse(readFileSync(file, 'utf8'), { parser: require('recast/parsers/typescript') })

		visit(code, {
			visitImportDeclaration(path) {
				path.value.source.value = resolveRelativePath(file, path.value.source.value)
				return false
			},
			visitExportAllDeclaration(path) {
				path.value.source.value = resolveRelativePath(file, path.value.source.value)
				return false
			},
			visitExportNamedDeclaration(path) {
				if (path.value.source) {
					path.value.source.value = resolveRelativePath(file, path.value.source.value)
				}
				return false
			},
		})

		writeFileSync(file, print(code).code)
	}
}
