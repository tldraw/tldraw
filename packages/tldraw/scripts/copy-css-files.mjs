import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const packageDir = join(__dirname, '..')

function readUiPackageCss() {
	const stylesDir = join(packageDir, '..', 'ui', 'src', 'styles')
	const first = ['tokens.css', 'base.css']
	const all = readdirSync(stylesDir).filter((f) => f.endsWith('.css'))
	const rest = all.filter((f) => !first.includes(f)).sort()
	const ordered = [...first.filter((f) => all.includes(f)), ...rest]

	return ordered.reduce((acc, file) => {
		return acc + readFileSync(join(stylesDir, file), 'utf8') + '\n'
	}, '')
}

let combinedContent = [
	join(packageDir, '..', 'editor', 'editor.css'),
	readUiPackageCss,
	join(packageDir, 'src', 'lib', 'ui.css'),
].reduce(
	(acc, source) => {
		const content = typeof source === 'function' ? source() : readFileSync(source, 'utf8')
		acc += content.trimEnd() + '\n\n'
		return acc
	},
	`/* THIS CSS FILE IS GENERATED! DO NOT EDIT. OR EDIT. I'M A COMMENT NOT A COP */
/* This file is created by the copy-css-files.mjs script in packages/tldraw. */
/* It combines @tldraw/editor's editor.css, @tldraw/ui's ui.css, and tldraw's ui.css */

`
)

const destination = join(packageDir, 'tldraw.css')
writeFileSync(destination, combinedContent.trimEnd() + '\n')
