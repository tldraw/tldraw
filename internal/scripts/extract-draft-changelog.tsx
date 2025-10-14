import { join } from 'path'
import { exec } from './lib/exec'
import { REPO_ROOT, writeStringFile } from './lib/file'
import { nicelog } from './lib/nicelog'

function convertPRLinks(text: string): string {
	// Convert (#1234) to ([#1234](https://github.com/tldraw/tldraw/issues/1234))
	return text.replace(/\(#(\d+)\)/g, '([#$1](https://github.com/tldraw/tldraw/issues/$1))')
}

function extractRelevantSections(message: string): string {
	// Extract Release Notes and API Changes sections (case-insensitive, flexible markdown heading levels)
	const lines = message.split('\n')
	const relevantSections: string[] = []
	let inRelevantSection = false
	let currentSection: string[] = []

	for (const line of lines) {
		// Check if this is a heading line (one or more #s followed by text)
		const headingMatch = line.match(/^(#{1,6})\s+(.+)$/i)
		if (headingMatch) {
			const headingText = headingMatch[2].trim().toLowerCase()

			// If we were in a relevant section, save it
			if (inRelevantSection && currentSection.length > 0) {
				relevantSections.push(currentSection.join('\n'))
				currentSection = []
			}

			// Check if this is a Release Notes or API Changes heading
			if (headingText.includes('release note') || headingText.includes('api change')) {
				inRelevantSection = true
				// Include the heading itself in the section
				currentSection.push(line)
			} else {
				inRelevantSection = false
			}
		} else if (inRelevantSection) {
			// We're in a relevant section, collect the line
			currentSection.push(line)
		}
	}

	// Don't forget the last section
	if (inRelevantSection && currentSection.length > 0) {
		relevantSections.push(currentSection.join('\n'))
	}

	// If we found relevant sections, return them joined together
	if (relevantSections.length > 0) {
		// Remove the section headings themselves (first line of each section)
		const sectionsWithoutHeadings = relevantSections
			.map((section) => {
				const sectionLines = section.split('\n')
				// Remove the first line (the heading) and keep the rest
				return sectionLines.slice(1).join('\n').trim()
			})
			.filter((section) => section.length > 0)

		return sectionsWithoutHeadings.join('\n\n').trim()
	}

	// Otherwise, return empty string (no content to include)
	return ''
}

async function getLatestMinorRelease() {
	// otherwise get the latest minor release
	const tags = (await exec('git', ['tag', '--list', `v*.*.0`, '--sort=-version:refname']))
		.toString()
		.trim()
	return tags.split('\n')[0]
}

export async function extractChangelog(startRef: string, endRef: string): Promise<string> {
	nicelog(`Extracting changelog from ${startRef} to ${endRef}`)

	const commitHashes = (await exec('git', ['cherry', startRef, endRef]))
		.trim()
		.split('\n')
		.filter((line) => !line.startsWith('-'))
		.map((line) => line.split(' ')[1])

	nicelog(`Found ${commitHashes.length} commits`)

	// Extract full commit messages for each commit
	const entries: Array<{
		firstLine: string
		restOfMessage: string
		changeType: string
		changedFolders: string[]
	}> = []

	for (const hash of commitHashes) {
		const fullMessage = await exec('git', ['log', '-1', '--pretty=format:%B', hash], {
			processStdoutLine: () => {}, // Suppress output
			processStderrLine: () => {},
		})

		const lines = fullMessage.trim().split('\n')
		const firstLine = lines[0] || hash

		// Skip commits with [skip ci] in the title
		if (firstLine.includes('[skip ci]')) {
			continue
		}

		// Get changed files for this commit
		const changedFiles = await exec('git', ['show', '--name-only', '--pretty=format:', hash], {
			processStdoutLine: () => {}, // Suppress output
			processStderrLine: () => {},
		})

		// Extract unique folders (max 2 levels deep) from changed files
		const folders = new Set<string>()
		changedFiles
			.split('\n')
			.filter((file) => file.trim())
			.forEach((file) => {
				const parts = file.split('/')
				if (parts.length >= 2) {
					folders.add(`${parts[0]}/${parts[1]}`)
				} else if (parts.length === 1) {
					folders.add(parts[0])
				}
			})

		let restOfMessage = lines.slice(1).join('\n').trim()

		// Extract change type from checkboxes
		let changeType = 'other'
		const changeTypes = ['bugfix', 'improvement', 'feature', 'api', 'other']

		for (const type of changeTypes) {
			if (restOfMessage.includes(`- [x] \`${type}\``)) {
				changeType = type
				break
			}
		}

		// Remove the Change type section and all checkboxes
		restOfMessage = restOfMessage
			// remove Change type section
			.replace(/### Change type[\s\n]*/g, '')
			// remove checkboxes
			.replace(/- \[[ x]\] `(bugfix|improvement|feature|api|other)`[\s\n]*/g, '')
			// remove co-authored-by lines
			.replace(/^co-authored-by: .*$/gim, '')
			// Clean up excessive newlines
			.replace(/\n{3,}/g, '\n\n')
			// remove trailing horizontal rule
			.trim()
			.replace(/-{3,}$/, '')
			.trim()

		// Extract only Release Notes and API Changes sections
		const extractedContent = extractRelevantSections(restOfMessage)

		// Convert PR links like (#1234) to full URLs
		const contentWithLinks = convertPRLinks(extractedContent)

		// Only include entries that touch packages/ folder (but not internal packages)
		const excludedPackages = ['packages/dotcom-shared', 'packages/worker-shared']
		const touchesPackages = Array.from(folders).some(
			(folder) => folder.startsWith('packages/') && !excludedPackages.includes(folder)
		)
		if (touchesPackages) {
			entries.push({
				firstLine: convertPRLinks(firstLine),
				restOfMessage: contentWithLinks,
				changeType,
				changedFolders: Array.from(folders).sort(),
			})
		}
	}

	// Group entries by change type
	const groupedEntries: Record<string, typeof entries> = {
		bugfix: [],
		improvement: [],
		feature: [],
		api: [],
		other: [],
	}

	for (const entry of entries) {
		groupedEntries[entry.changeType].push(entry)
	}

	// Generate output.md content
	let output = `Generated from commits between \`${startRef}\` and \`${endRef}\`\n\n`

	// Output each change type section
	const changeTypeLabels = {
		bugfix: 'Bug Fixes',
		improvement: 'Improvements',
		feature: 'Features',
		api: 'API Changes',
		other: 'Other Changes',
	}

	for (const [changeType, label] of Object.entries(changeTypeLabels)) {
		const entriesForType = groupedEntries[changeType]
		if (entriesForType.length === 0) continue

		output += `## ${label}\n\n`

		for (const entry of entriesForType) {
			output += `### ${entry.firstLine}\n\n`

			if (entry.restOfMessage) {
				output += `${entry.restOfMessage}\n\n`
			}
		}
	}

	nicelog(`Extracted ${entries.length} changelog entries`)
	return output
}

async function main() {
	const args = process.argv.slice(2)

	await exec('git', ['fetch', 'origin'])
	await exec('git', ['fetch', 'origin', '--tags'])

	if (args.includes('--help') || args.includes('-h')) {
		console.error('Usage: yarn extract-draft-changelog [start-ref] [end-ref]')
		console.error('Example: yarn extract-draft-changelog v2.0.0 HEAD')
		console.error('Example: yarn extract-draft-changelog v2.0.0  # uses current HEAD')
		process.exit(1)
	}

	const startRef = args[0] || (await getLatestMinorRelease())
	const endRef = args[1] || 'origin/production'

	try {
		const output = await extractChangelog(startRef, endRef)

		// Write to changelog.md in the repo root
		const outputPath = join(REPO_ROOT, 'changelog.md')
		await writeStringFile(outputPath, output)

		nicelog(`Draft changelog written to changelog.md`)
	} catch (error) {
		console.error('Error extracting changelog:', error)
		process.exit(1)
	}
}

if (require.main === module) {
	main().catch((error) => {
		console.error('Unhandled error:', error)
		process.exit(1)
	})
}
