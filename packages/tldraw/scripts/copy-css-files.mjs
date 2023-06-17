import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const packageDir = join(__dirname, '..')

let combinedContent = [
	join(packageDir, '..', 'editor', 'editor.css'),
	join(packageDir, '..', 'ui', 'ui.css'),
].reduce(
	(acc, path) => {
		const content = readFileSync(path, 'utf8')
		acc += content + '\n'
		return acc
	},
	`/* THIS CSS FILE IS GENERATED! DO NOT EDIT. OR EDIT. I'M A COMMENT NOT A COP */ 
/* This file is created by the copy-css-files.mjs script in @tldraw/tldraw. */
/* It combines @tldraw/editor/editor.css and @tldraw/ui/ui.css */

`
)

const destination = join(packageDir, 'tldraw.css')
writeFileSync(destination, combinedContent)
