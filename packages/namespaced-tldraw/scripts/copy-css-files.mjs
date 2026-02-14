import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const packageDir = join(__dirname, '..')

const content = readFileSync(join(packageDir, '..', 'tldraw', 'tldraw.css'), 'utf8')
const destination = join(packageDir, 'tldraw.css')
writeFileSync(destination, content)
