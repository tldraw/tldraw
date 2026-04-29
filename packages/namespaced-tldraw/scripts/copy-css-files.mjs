import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const packageDir = join(__dirname, '..')

// Generate CSS from source files directly (same sources as packages/tldraw)
// to avoid depending on tldraw's generated tldraw.css which may not exist
// when lazyrepo caching skips the prebuild step.
let combinedContent = [
	join(packageDir, '..', 'editor', 'editor.css'),
	join(packageDir, '..', 'tldraw', 'src', 'lib', 'ui.css'),
].reduce(
	(acc, path) => {
		const content = readFileSync(path, 'utf8')
		acc += content + '\n'
		return acc
	},
	`/* THIS CSS FILE IS GENERATED! DO NOT EDIT. OR EDIT. I'M A COMMENT NOT A COP */
/* This file is created by the copy-css-files.mjs script in packages/namespaced-tldraw. */
/* It combines @tldraw/editor's editor.css and tldraw's ui.css */

`
)

const destination = join(packageDir, 'tldraw.css')
writeFileSync(destination, combinedContent)
