import * as fs from 'fs'
import * as path from 'path'

const { log: nicelog } = console

const REWRITE_DOMAIN = 'tldrawdotdev.framer.website'
const SITEMAP_URL = `https://${REWRITE_DOMAIN}/sitemap.xml`

async function fetchFramerSitemap(): Promise<string[]> {
	const response = await fetch(SITEMAP_URL)
	if (!response.ok) {
		throw new Error(`Failed to fetch sitemap: ${response.statusText}`)
	}

	const xml = await response.text()
	const locRegex = /<loc>([^<]+)<\/loc>/g
	const paths: string[] = []

	let match
	while ((match = locRegex.exec(xml)) !== null) {
		const url = match[1]
		const urlObj = new URL(url)
		paths.push(urlObj.pathname)
	}

	return paths
}

function getCurrentRewrites(configPath: string): Set<string> {
	const configContent = fs.readFileSync(configPath, 'utf-8')
	const sourceRegex = /source:\s*['"]([^'"]+)['"]/g
	const rewrites = new Set<string>()

	let match
	while ((match = sourceRegex.exec(configContent)) !== null) {
		rewrites.add(match[1])
	}

	return rewrites
}

function pathMatchesRewrite(p: string, rewritePattern: string): boolean {
	const normalizedPath = p.replace(/\/$/, '')
	const normalizedPattern = rewritePattern.replace(/\/$/, '')

	if (normalizedPath === normalizedPattern) {
		return true
	}

	if (normalizedPattern.includes(':path*')) {
		const prefix = normalizedPattern.split('/:path*')[0]
		return normalizedPath.startsWith(prefix)
	}
	if (normalizedPattern.includes(':path+')) {
		const prefix = normalizedPattern.split('/:path+')[0]
		return normalizedPath.startsWith(prefix) && normalizedPath !== prefix
	}

	if (normalizedPattern.includes('/:')) {
		const parts = normalizedPattern.split('/')
		const pathParts = normalizedPath.split('/')

		if (parts.length !== pathParts.length) {
			return false
		}

		return parts.every((part, i) => {
			if (part.startsWith(':')) {
				return true
			}
			return part === pathParts[i]
		})
	}

	return false
}

function findMissingRewrites(framerPaths: string[], currentRewrites: Set<string>): string[] {
	return framerPaths.filter((p) => {
		for (const rewrite of currentRewrites) {
			if (pathMatchesRewrite(p, rewrite)) {
				return false
			}
		}
		return true
	})
}

function addRewritesToConfig(configPath: string, missingRewrites: string[]): void {
	let configContent = fs.readFileSync(configPath, 'utf-8')

	// Find the beforeFiles array
	const beforeFilesStart = configContent.indexOf('beforeFiles: [')
	const beforeFilesEnd = configContent.indexOf('],', beforeFilesStart)

	if (beforeFilesStart === -1 || beforeFilesEnd === -1) {
		throw new Error('Could not find beforeFiles array in next.config.js')
	}

	// Extract current beforeFiles content
	const beforeFilesContent = configContent.substring(
		beforeFilesStart + 'beforeFiles: ['.length,
		beforeFilesEnd
	)

	// Parse existing rewrites
	const existingRewrites: Array<{ source: string; destination: string }> = []
	const rewriteBlockRegex =
		/\{\s*source:\s*['"]([^'"]+)['"]\s*,\s*destination:\s*[`'"]([^`'"]+)[`'"]\s*,?\s*\}/g

	let match
	while ((match = rewriteBlockRegex.exec(beforeFilesContent)) !== null) {
		existingRewrites.push({ source: match[1], destination: match[2] })
	}

	// For each missing rewrite, find where to insert it alphabetically
	const sortedMissing = [...missingRewrites].sort()

	for (const path of sortedMissing) {
		// Find the insertion point
		let insertIndex = 0
		for (let i = 0; i < existingRewrites.length; i++) {
			if (path.localeCompare(existingRewrites[i].source) < 0) {
				insertIndex = i
				break
			}
			insertIndex = i + 1
		}

		// Insert at the found position
		existingRewrites.splice(insertIndex, 0, {
			source: path,
			destination: `https://\${REWRITE_DOMAIN}${path}`,
		})
	}

	// Rebuild the array with consistent formatting
	const rewriteEntries = existingRewrites
		.map((r) => {
			// Use template literal only if there's interpolation
			const destQuote = r.destination.includes('${') ? '`' : "'"
			return `\t\t\t\t{\n\t\t\t\t\tsource: '${r.source}',\n\t\t\t\t\tdestination: ${destQuote}${r.destination}${destQuote},\n\t\t\t\t}`
		})
		.join(',\n')

	const newBeforeFiles = `beforeFiles: [\n${rewriteEntries},\n\t\t\t],`

	configContent =
		configContent.substring(0, beforeFilesStart) +
		newBeforeFiles +
		configContent.substring(beforeFilesEnd + 2)

	fs.writeFileSync(configPath, configContent, 'utf-8')
}

async function addMissingRewrites() {
	nicelog('• Fetching Framer sitemap...')

	const framerPaths = await fetchFramerSitemap()
	const configPath = path.join(__dirname, '../next.config.js')
	const currentRewrites = getCurrentRewrites(configPath)
	const missingRewrites = findMissingRewrites(framerPaths, currentRewrites)

	nicelog(`• Found ${framerPaths.length} paths in Framer sitemap`)
	nicelog(`• Found ${currentRewrites.size} existing rewrites in config`)

	if (missingRewrites.length === 0) {
		nicelog('✔ No missing rewrites found')
		return { added: 0, paths: [] }
	}

	nicelog(`• Adding ${missingRewrites.length} missing rewrites...`)
	addRewritesToConfig(configPath, missingRewrites)

	nicelog('✔ Successfully added missing rewrites')

	return { added: missingRewrites.length, paths: missingRewrites }
}

if (import.meta.url === `file://${process.argv[1]}`) {
	addMissingRewrites()
		.then(() => {
			process.exit(0)
		})
		.catch((error) => {
			console.error('Error:', error)
			process.exit(1)
		})
}

export { addMissingRewrites }
