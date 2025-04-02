import esbuild from 'esbuild'
import { readFile } from 'fs/promises'
import path from 'path'
import { REPO_ROOT, writeCodeFile } from './lib/file'

const exportsPath = path.join(REPO_ROOT, 'packages', 'editor', 'src', 'lib', 'exports')
const normalizeCssPath = path.join(exportsPath, 'normalize.css')
const outputPath = path.join(exportsPath, 'normalizeCss.ts')

const expectedLicense =
	'/*! modern-normalize v3.0.1 | MIT License | https://github.com/sindresorhus/modern-normalize */'

export async function main() {
	const input = await readFile(normalizeCssPath, 'utf-8')

	const licenseIndex = input.indexOf(expectedLicense)
	if (licenseIndex === -1) {
		throw new Error('License not found in normalize.css')
	}

	const headerComments = input.slice(0, licenseIndex + expectedLicense.length)
	const remaining = input.slice(licenseIndex + expectedLicense.length)

	const minified = await esbuild.transform(remaining, {
		loader: 'css',
		minify: true,
		// a relatively old set of browsers for max compatibility
		target: ['chrome109', 'safari15', 'firefox115'],
	})

	const code = `
    ${headerComments}

    export const normalizeCss = ${JSON.stringify(minified.code)}
    `
	await writeCodeFile('build-export-css.ts from normalize.css', 'typescript', outputPath, code)
}

main()
