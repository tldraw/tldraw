import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const packageDir = join(__dirname, '..')
const stylesDir = join(packageDir, 'src', 'styles')

// Concatenate the css partials in a stable order. Tokens and base styles
// come first, then everything else alphabetically.
const FIRST = ['tokens.css', 'base.css']
const all = readdirSync(stylesDir).filter((f) => f.endsWith('.css'))
const rest = all.filter((f) => !FIRST.includes(f)).sort()
const ordered = [...FIRST.filter((f) => all.includes(f)), ...rest]

let combinedContent = ordered.reduce(
	(acc, file) => {
		const content = readFileSync(join(stylesDir, file), 'utf8')
		acc += `/* ---------------------- ${file} ---------------------- */\n\n` + content + '\n'
		return acc
	},
	`/* THIS CSS FILE IS GENERATED! DO NOT EDIT. OR EDIT. I'M A COMMENT NOT A COP */
/* This file is created by the build-css.mjs script in packages/ui. */
/* It combines the css partials in packages/ui/src/styles. */

`
)

const destination = join(packageDir, 'ui.css')
writeFileSync(destination, combinedContent.trimEnd() + '\n')
