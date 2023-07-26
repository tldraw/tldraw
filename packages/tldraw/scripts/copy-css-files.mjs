import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const packageDir = join(__dirname, '..')

let editorCss = join(packageDir, 'src', 'lib', 'editor', 'editor.css')
let uiCss = join(packageDir, 'src', 'lib', 'ui', 'ui.css')
let combinedCss = [editorCss, uiCss].reduce(
	(acc, path) => {
		const content = readFileSync(path, 'utf8')
		acc += content + '\n'
		return acc
	},
	`
/* This file is created by the copy-css-files.mjs script in @tldraw/tldraw. */
/* It combines editor.css and ui.css */
	
	`
)

editorCss = `/* THIS CSS FILE IS GENERATED! DO NOT EDIT. OR EDIT. I'M A COMMENT NOT A COP */
${editorCss}`

uiCss = `/* THIS CSS FILE IS GENERATED! DO NOT EDIT. OR EDIT. I'M A COMMENT NOT A COP */
${uiCss}`

combinedCss = `/* THIS CSS FILE IS GENERATED! DO NOT EDIT. OR EDIT. I'M A COMMENT NOT A COP */
${combinedCss}`

writeFileSync(join(packageDir, 'editor.css'), editorCss)
writeFileSync(join(packageDir, 'ui.css'), uiCss)
writeFileSync(join(packageDir, 'tldraw.css'), combinedCss)
