// Reports the third-party licenses in packages/* as html (for printing to PDF), markdown, and — in
// `--prod` mode — the docs page at apps/docs/content/community/dependencies.mdx.
//
// Only published packages/* workspaces are covered: nothing else ships to SDK consumers.

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { relative } from 'path'
import { glob } from 'glob'
import { exec } from './lib/exec'

// `remoteVersion` is omitted: it's the newest published version matching our range, so it changes
// whenever an upstream maintainer publishes, committing a new page on unrelated PRs. The rest is a
// function of the lockfile.
const FIELDS = [
	'department',
	'relatedTo',
	'name',
	'licensePeriod',
	'material',
	'licenseType',
	'link',
	'installedVersion',
	'definedVersion',
	'author',
] as const

const COLUMN_LABELS = [
	'department',
	'related to',
	'name',
	'license period',
	'material / not material',
	'license type',
	'link',
	'installed version',
	'defined version',
	'author',
]

const DOCS_PAGE_PATH = 'apps/docs/content/community/dependencies.mdx'

interface ReportRow {
	department: string
	relatedTo: string
	name: string
	licensePeriod: string
	material: string
	licenseType: string
	link: string
	installedVersion: string
	definedVersion: string
	author: string
}

interface InlineLicense {
	file: string
	licenseType: string
	copyright: string
	licenseUrl: string
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

				// Extract license type (MIT License, BSD License, Apache License, etc.)
				const licenseMatch = comment.match(/(MIT|BSD|Apache|ISC)[\s]*License/i)
				if (licenseMatch) {
					licenseType = licenseMatch[0].replace('License', '').trim()
				}

				// Extract copyright
				const copyrightMatch = comment.match(/Copyright[\s]*(?:\(c\))?[\s]*(.+?)(?:\n|$)/i)
				if (copyrightMatch) {
					copyright = copyrightMatch[1].replace(/^[:\-–—\s]+/, '').trim()
				}

				// Extract license URL
				const licenseUrlMatch = comment.match(
					/(?:MIT|BSD|Apache|ISC)[\s]*License:\s*(https?:\/\/[^\s\n]+)/i
				)
				if (licenseUrlMatch) {
					licenseUrl = licenseUrlMatch[1]
				}

				const relativePath = relative(rootDir, file)
				licenses.push({
					file: relativePath,
					licenseType,
					copyright,
					licenseUrl,
				})
			}
		} catch (_e) {
			// Skip files that can't be read
		}
	}

	return licenses.sort((a, b) => a.file.localeCompare(b.file))
}

function getWorkspaces(): string[] {
	return execSync('yarn workspaces list', { encoding: 'utf-8' })
		.split('\n')
		.map((line) => line.split(': ')[1])
		.filter((location) => location && location.startsWith('packages/'))
		.filter((location) => {
			// Private packages (dotcom-shared, worker-shared) never reach npm, so their dependencies
			// aren't part of what an SDK consumer installs.
			const manifest = JSON.parse(readFileSync(`${location}/package.json`, 'utf-8'))
			return !manifest.private
		})
		.sort()
}

async function getReportRows(location: string, only: string): Promise<ReportRow[]> {
	// `yarn exec` rather than `yarn license-report`, which would resolve to the root script that
	// runs this file.
	const output = await exec(
		'yarn',
		[
			'exec',
			'license-report',
			`--package=${location}/package.json`,
			'--department.value=tldraw',
			'--relatedTo.label=Package',
			`--relatedTo.value=${location}`,
			'--output=json',
			`--only=${only}`,
			...FIELDS.map((field) => `--fields=${field}`),
		],
		{ processStdoutLine: () => {}, processStderrLine: () => {} }
	)

	const start = output.indexOf('[')
	const end = output.lastIndexOf(']')
	if (start === -1 || end === -1) {
		throw new Error(`Could not find JSON in license-report output for ${location}`)
	}

	const rows: ReportRow[] = JSON.parse(output.slice(start, end + 1))

	// Workspace dependencies are our own packages, covered by the tldraw license rather than a
	// third party's. license-report can't resolve them either, so they'd read as "n/a".
	return rows.filter((row) => !row.definedVersion.startsWith('workspace:'))
}

/** Turn the various git remote spellings npm records into something a reader can click. */
function toHttpsUrl(link: string): string | null {
	if (!link || link === 'n/a') return null
	const https = link
		.replace(/^git\+ssh:\/\/git@/, 'https://')
		.replace(/^git\+https:\/\//, 'https://')
		.replace(/^git\+http:\/\//, 'http://')
		.replace(/^git:\/\//, 'https://')
		.replace(/\.git$/, '')
	return https.startsWith('http') ? https : null
}

function escapeCell(value: string): string {
	return value.replace(/\|/g, '\\|')
}

/**
 * MDX reads `<` as the start of a JSX tag and `{` as the start of an expression, so an author string
 * like `Sindre Sorhus <sindresorhus@gmail.com>` is a parse error that fails the docs build.
 */
function escapeMdxCell(value: string): string {
	return escapeCell(value)
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/\{/g, '&#123;')
		.replace(/\}/g, '&#125;')
}

/** Author and copyright strings carry bracketed emails, which a browser would eat as a tag. */
function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

function generateHtml(rows: ReportRow[], inlineLicenses: InlineLicense[]): string {
	const headerCells = [...COLUMN_LABELS, 'source']
		.map((label) => `<th class="string">${label}</th>`)
		.join('')

	const packageRows = rows
		.map((row) => {
			const link = toHttpsUrl(row.link)
			const cells = FIELDS.map((field) =>
				field === 'link' && link
					? `<a href="${escapeHtml(link)}">${escapeHtml(link)}</a>`
					: escapeHtml(row[field])
			)
			return `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}<td></td></tr>`
		})
		.join('\n')

	const inlineRows = inlineLicenses
		.map((license) => {
			const licenseLink = license.licenseUrl
				? `<a href="${escapeHtml(license.licenseUrl)}">License</a>`
				: ''
			const cells = [
				'tldraw',
				'Inline Code',
				escapeHtml(license.file),
				'',
				'not material',
				escapeHtml(license.licenseType),
				licenseLink,
				'',
				'',
				escapeHtml(license.copyright),
				'',
			]
			return `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`
		})
		.join('\n')

	return `
<html>
<body>
<table><thead><tr>${headerCells}</tr></thead><tbody>
${packageRows}
<tr></tr>
${inlineRows}
</tbody></table>
</body>
</html>
`
}

function generateMarkdown(rows: ReportRow[], inlineLicenses: InlineLicense[]): string {
	const headers = [...COLUMN_LABELS, 'source']

	const packageRows = rows.map((row) => {
		const link = toHttpsUrl(row.link)
		return FIELDS.map((field) =>
			field === 'link' ? (link ? `[${link}](${link})` : row.link) : row[field]
		).concat('')
	})

	const inlineRows = inlineLicenses.map((license) => [
		'tldraw',
		'Inline Code',
		license.file,
		'',
		'not material',
		license.licenseType,
		license.licenseUrl ? `[License](${license.licenseUrl})` : '',
		'',
		'',
		license.copyright,
		'',
	])

	return `# License Report

| ${headers.join(' | ')} |
| ${headers.map(() => '---').join(' | ')} |
${[...packageRows, ...inlineRows].map((row) => `| ${row.map(escapeCell).join(' | ')} |`).join('\n')}
`
}

function generateDocsPage(rows: ReportRow[], inlineLicenses: InlineLicense[]): string {
	// One row per dependency rather than per declaring package. Keyed by version too: two packages
	// resolving the same dependency to different versions are two things to report, not one.
	const byNameAndVersion = new Map<string, { row: ReportRow; usedBy: string[] }>()
	for (const row of rows) {
		const key = `${row.name}@${row.installedVersion}`
		const existing = byNameAndVersion.get(key)
		if (existing) {
			existing.usedBy.push(row.relatedTo)
		} else {
			byNameAndVersion.set(key, { row, usedBy: [row.relatedTo] })
		}
	}

	const dependencyRows = [...byNameAndVersion.values()]
		.sort(
			(a, b) =>
				a.row.name.localeCompare(b.row.name) ||
				a.row.installedVersion.localeCompare(b.row.installedVersion)
		)
		.map(({ row, usedBy }) => {
			const link = toHttpsUrl(row.link)
			const name = escapeMdxCell(row.name)
			const packages = usedBy
				.map((location) => `\`${location.replace(/^packages\//, '')}\``)
				.join(', ')
			return `| ${link ? `[${name}](${link})` : name} | ${escapeMdxCell(row.installedVersion)} | ${escapeMdxCell(row.licenseType)} | ${packages} |`
		})
		.join('\n')

	const inlineRows = inlineLicenses
		.map((license) => {
			const type = escapeMdxCell(license.licenseType)
			return `| \`${license.file}\` | ${license.licenseUrl ? `[${type}](${license.licenseUrl})` : type} | ${escapeMdxCell(license.copyright)} |`
		})
		.join('\n')

	const inlineSection = inlineLicenses.length
		? `
## Inline code

Some third-party code is included directly in our source rather than as a dependency. Each of these files carries its license in a comment at the top.

| File | License | Copyright |
| --- | --- | --- |
${inlineRows}
`
		: ''

	return `---
title: Dependencies
description: The third-party packages that the tldraw SDK depends on, and the licenses they are published under.
status: published
order: 3
keywords:
  - license
  - licenses
  - dependencies
  - third party
  - open source
  - compliance
---

{/* This page is generated by \`yarn license-report --prod\`. Do not edit it by hand. */}

The tldraw SDK itself is published under the [tldraw license](/legal/tldraw-license). It also depends on the third-party packages listed below, each under its own license.

This covers the runtime dependencies that the \`@tldraw/*\` packages declare directly. It does not include their own transitive dependencies, our development and build tooling, or anything in the tldraw.com application. If you need a full transitive list for the exact versions you have installed, generate one from your own lockfile.

## Dependencies

| Dependency | Version | License | Used by |
| --- | --- | --- | --- |
${dependencyRows}
${inlineSection}`
}

async function main() {
	const devOnly = process.argv.includes('--dev')
	const prodOnly = process.argv.includes('--prod')
	const only = devOnly ? 'dev' : prodOnly ? 'prod' : 'dev,prod,peer,opt'

	// Not tolerated per-workspace: a registry blip would silently drop that workspace's packages,
	// and CI would commit the truncated list to the public page.
	const rows: ReportRow[] = []
	for (const location of getWorkspaces()) {
		console.log('running license-report in', location)
		rows.push(...(await getReportRows(location, only)))
	}

	console.log('\nSearching for inline license comments (/*!)...')
	const inlineLicenses = parseInlineLicenses(process.cwd())
	console.log(`Found ${inlineLicenses.length} files with inline license comments`)

	const suffix = prodOnly ? '-prod' : devOnly ? '-dev' : ''
	writeFileSync(`license-report${suffix}.html`, generateHtml(rows, inlineLicenses))
	writeFileSync(`license-report${suffix}.md`, generateMarkdown(rows, inlineLicenses))
	console.log(`\nGenerated license-report${suffix}.html and license-report${suffix}.md`)

	// The docs page lists what SDK consumers actually ship, so it only tracks the prod report.
	if (prodOnly) {
		writeFileSync(DOCS_PAGE_PATH, generateDocsPage(rows, inlineLicenses))
		// oxfmt pads markdown table columns, so an unformatted page here would be rewritten by the
		// next `yarn format` and then reverted by the next regeneration.
		await exec('yarn', ['oxfmt', '--write', DOCS_PAGE_PATH], {
			processStdoutLine: () => {},
			processStderrLine: () => {},
		})
		console.log(`Generated ${DOCS_PAGE_PATH}`)
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
