import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const packageDir = join(__dirname, '..')

const combinedContent = [
	join(packageDir, 'src', 'ui', 'comments.css'),
	join(packageDir, 'src', 'canvas', 'canvas.css'),
].reduce(
	(acc, path) => {
		const content = readFileSync(path, 'utf8')
		acc += content + '\n'
		return acc
	},
	`/* THIS CSS FILE IS GENERATED! DO NOT EDIT. OR EDIT. I'M A COMMENT NOT A COP */
/* This file is created by the copy-css-files.mjs script in packages/commenting. */
/* It combines the commenting package's ui and canvas stylesheets. */

`
)

const destination = join(packageDir, 'commenting.css')
writeFileSync(destination, combinedContent)
