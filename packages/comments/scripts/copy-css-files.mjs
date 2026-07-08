import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const packageDir = join(__dirname, '..')

let combinedContent = [
	join(packageDir, 'src', 'ui', 'comments.css'),
	join(packageDir, 'src', 'canvas', 'canvas.css'),
].reduce(
	(acc, path) => {
		const content = readFileSync(path, 'utf8')
		acc += content + '\n'
		return acc
	},
	`/* THIS CSS FILE IS GENERATED! DO NOT EDIT. OR EDIT. I'M A COMMENT NOT A COP */
/* This file is created by the copy-css-files.mjs script in packages/comments. */
/* It combines @tldraw/comments's ui/comments.css and canvas/canvas.css */

`
)

const destination = join(packageDir, 'comments.css')
writeFileSync(destination, combinedContent)
