import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const packageDir = join(__dirname, '..')
const commentingDir = join(packageDir, '..', 'commenting')

// Generate commenting.css first, so the list of source stylesheets lives in one place (the
// commenting package's own script) and this one can't silently drift out of sync with it.
await import('../../commenting/scripts/copy-css-files.mjs')

// Republish it under the umbrella's name, swapping the provenance header for our own.
const commentingCss = readFileSync(join(commentingDir, 'commenting.css'), 'utf8').replace(
	/^(\/\*[^\n]*\*\/\n)+\n?/,
	''
)

const combinedContent = `/* THIS CSS FILE IS GENERATED! DO NOT EDIT. OR EDIT. I'M A COMMENT NOT A COP */
/* This file is created by the copy-css-files.mjs script in packages/collaboration. */
/* It combines the stylesheets of the collaboration umbrella's sub-packages. */

${commentingCss}`

const destination = join(packageDir, 'collaboration.css')
writeFileSync(destination, combinedContent)
