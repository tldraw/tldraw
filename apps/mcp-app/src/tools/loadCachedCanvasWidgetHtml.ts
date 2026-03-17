import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DIST_DIR = path.join(__dirname, '..', '..', 'dist')

let cachedHtml: string | null = null

export async function loadCachedCanvasWidgetHtml(): Promise<string> {
	if (cachedHtml) return cachedHtml
	const html = await fs.readFile(path.join(DIST_DIR, 'mcp-app.html'), 'utf-8')
	cachedHtml = html
	return html
}
