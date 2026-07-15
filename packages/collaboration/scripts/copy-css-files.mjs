import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const packageDir = join(__dirname, '..')
const commentingDir = join(packageDir, '..', 'commenting')

const combinedContent = [
	join(commentingDir, 'src', 'ui', 'comments.css'),
	join(commentingDir, 'src', 'canvas', 'canvas.css'),
].reduce(
	(acc, path) => {
		const content = readFileSync(path, 'utf8')
		acc += content + '\n'
		return acc
	},
	`/* THIS CSS FILE IS GENERATED! DO NOT EDIT. OR EDIT. I'M A COMMENT NOT A COP */
/* This file is created by the copy-css-files.mjs script in packages/collaboration. */
/* It combines the stylesheets of the collaboration umbrella's sub-packages. */

`
)

const destination = join(packageDir, 'collaboration.css')
writeFileSync(destination, combinedContent)
