import { join } from 'path'

import { existsSync, rmSync } from 'fs'
import { copy } from 'fs-extra'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const packageDir = join(__dirname, '..')

const files = [
	{
		from: join(packageDir, '..', 'editor', 'editor.css'),
		to: join(packageDir, 'editor.css'),
	},
	{
		from: join(packageDir, '..', 'ui', 'ui.css'),
		to: join(packageDir, 'ui.css'),
	},
]

for (const { from, to } of files) {
	if (existsSync(to)) {
		rmSync(to)
	}

	await copy(from, to)
}
