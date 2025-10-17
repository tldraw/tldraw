// For all package.jsons found in the monorepo, generate a license report
// by running the `license-report --output=html` script in each package.

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'
import { relative } from 'path'
import { exec } from './lib/exec'

interface InlineLicense {
	file: string
	licenseType: string
	copyright: string
	licenseUrl: string
	sourceUrl?: string
}

function parseInlineLicenses(rootDir: string): InlineLicense[] {
	const licenses: InlineLicense[] = []

	// Find all files with /*! comments
	const files = glob.sync('**/*.{ts,tsx,js,jsx,css}', {
		cwd: rootDir,
		ignore: [
			'**/node_modules/**',
			'**/dist/**',
			'**/build/**',
			'**/.next/**',
			'apps/**',
			'internal/**',
			'templates/**',
		],
		absolute: true,
	})

	for (const file of files) {
		try {
			const content = readFileSync(file, 'utf-8')

			// Find all /*! comment blocks in the file (using global flag)
			const commentMatches = content.matchAll(/\/\*!([\s\S]*?)\*\//g)

			for (const commentMatch of commentMatches) {
				const comment = commentMatch[1]

				// Parse license information
				let licenseType = 'Unknown'
				let copyright = ''
				let licenseUrl = ''
				let sourceUrl = ''

				// Extract license type (MIT License, BSD License, Apache License, etc.)
				const licenseMatch = comment.match(/(MIT|BSD|Apache|ISC)[\s]*License/i)
				if (licenseMatch) {
					licenseType = licenseMatch[0].replace('License', '').trim()
				}

				// Extract copyright
				const copyrightMatch = comment.match(/Copyright[\s]*(?:\(c\))?[\s]*(.+?)(?:\n|$)/i)
				if (copyrightMatch) {
					copyright = copyrightMatch[1].trim()
				}

				// Extract license URL
				const licenseUrlMatch = comment.match(
					/(?:MIT|BSD|Apache|ISC)[\s]*License:\s*(https?:\/\/[^\s\n]+)/i
				)
				if (licenseUrlMatch) {
					licenseUrl = licenseUrlMatch[1]
				}

				// Extract source URL
				const sourceUrlMatch = comment.match(/(?:from|Code:|Originally from)\s*<?([^>\n]+)>?/i)
				if (sourceUrlMatch) {
					sourceUrl = sourceUrlMatch[1].trim()
				}

				const relativePath = relative(rootDir, file)
				licenses.push({
					file: relativePath,
					licenseType,
					copyright,
					licenseUrl,
					sourceUrl,
				})
			}
		} catch (_e) {
			// Skip files that can't be read
		}
	}

	return licenses
}

// Use `yarn workspace list` to get all the packages in the monorepo
async function main() {
	const devOnly = process.argv.includes('--dev')
	const prodOnly = process.argv.includes('--prod')

	const htmlTables: { title: string; content: string }[] = []
	const markdownRows: string[][] = []

	const workspaceList = execSync('yarn workspaces list', {
		encoding: 'utf-8',
	})
		.split('\n')
		.map((line) => line.split(': ')[1])
		.filter(
			(line) =>
				line &&
				line !== '.' &&
				!line.startsWith('apps/') &&
				!line.startsWith('internal/') &&
				!line.startsWith('templates/')
		)
		.join('\n')
	const lines = workspaceList.split('\n')
	lines.pop() // remove // Done
	for (let i = 0; i < lines.length; i++) {
		const location = lines[i]
		try {
			console.log('running license-report in', location)
			const report = await exec(
				'yarn',
				[
					'license-report',
					`--package=${location}/package.json`,
					'--department.value=tldraw',
					'--relatedTo.label=Package',
					`--relatedTo.value=${location}`,
					'--output=html',
					`--only=${devOnly ? 'dev' : prodOnly ? 'prod' : 'dev,prod,peer,opt'}`,
				],
				{ processStdoutLine: () => {}, processStderrLine: () => {} }
			)
			// Extract the <table> contents from the report
			const table = report.match(/<tbody>.*<\/tbody>/gs)
			if (!table) {
				console.error('Error extracting table from license-report result.')
				process.exit(1)
			}
			// Add empty source column to each row
			const modifiedTable = table[0].replace(/<\/tr>/g, '<td></td></tr>')
			htmlTables.push({ title: location, content: modifiedTable })

			// Extract data for markdown
			const rows = table[0].match(/<tr>.*?<\/tr>/gs)
			if (rows) {
				for (const row of rows) {
					const cells = row.match(/<td[^>]*>(.*?)<\/td>/gs)
					if (cells) {
						const cellData = cells.map((cell) => {
							// Remove HTML tags and clean up content
							let content = cell.replace(/<td[^>]*>/, '').replace(/<\/td>/, '')
							// Extract text from links
							content = content.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
							// Remove any remaining HTML tags
							content = content.replace(/<[^>]*>/g, '').trim()
							return content
						})
						// Add empty Source column for npm package rows
						cellData.push('')
						markdownRows.push(cellData)
					}
				}
			}
		} catch (e) {
			console.error(`Error running license-report in ${location}, ${e}`)
		}
	}

	// Parse inline license comments from source files
	console.log('\nSearching for inline license comments (/*!)...')
	const rootDir = process.cwd()
	const inlineLicenses = parseInlineLicenses(rootDir)
	console.log(`Found ${inlineLicenses.length} files with inline license comments`)

	// Add inline licenses to the tables
	if (inlineLicenses.length > 0) {
		// Generate HTML rows for inline licenses
		let inlineHtmlRows = ''
		for (const license of inlineLicenses) {
			// const sourceLink = license.sourceUrl ? `<a href="${license.sourceUrl}">${license.sourceUrl}</a>` : ''
			const licenseLink = license.licenseUrl ? `<a href="${license.licenseUrl}">License</a>` : ''
			inlineHtmlRows += `
				<tr>
					<td>tldraw</td>
					<td>Inline Code</td>
					<td>${license.file}</td>
					<td></td>
					<td>not material</td>
					<td>${license.licenseType}</td>
					<td>${licenseLink}</td>
					<td></td>
					<td></td>
					<td></td>
					<td>${license.copyright}</td>
				</tr>
			`
		}
		htmlTables.push({ title: 'Inline License Comments', content: inlineHtmlRows })

		// Add inline licenses to markdown rows
		for (const license of inlineLicenses) {
			// const sourceLink = license.sourceUrl ? `[Source](${license.sourceUrl})` : ''
			const licenseLink = license.licenseUrl ? `[License](${license.licenseUrl})` : ''
			markdownRows.push([
				'tldraw',
				'Inline Code',
				license.file,
				'',
				'not material',
				license.licenseType,
				licenseLink,
				'',
				'',
				'',
				license.copyright,
			])
		}
	}

	const html = `
<html>
<body>
<table><thead><tr><th class="string">department</th><th class="string">related to</th><th class="string">name</th><th class="string">license period</th><th class="string">material / not material</th><th class="string">license type</th><th class="string">link</th><th class="string">remote version</th><th class="string">installed version</th><th class="string">defined version</th><th class="string">author</th><th class="string">source</th></tr></thead><tbody>
${htmlTables.reduce((acc, { content }) => {
	acc += content + '<tr></tr>'
	return acc
}, '')}
</tbody></table>
</body>
</html>
`

	// Generate markdown table
	const headers = [
		'Department',
		'Package',
		'Name',
		'License Period',
		'Material',
		'License Type',
		'Link',
		'Remote Version',
		'Installed Version',
		'Defined Version',
		'Author',
		'Source',
	]
	const markdown = `# License Report

| ${headers.join(' | ')} |
| ${headers.map(() => '---').join(' | ')} |
${markdownRows.map((row) => `| ${row.map((cell) => cell.replace(/\|/g, '\\|')).join(' | ')} |`).join('\n')}
`

	const suffix = prodOnly ? '-prod' : devOnly ? '-dev' : ''

	writeFileSync(`license-report${suffix}.html`, html)
	writeFileSync(`license-report${suffix}.md`, markdown)

	console.log(`\nGenerated license-report${suffix}.html and license-report${suffix}.md`)
}

main()
