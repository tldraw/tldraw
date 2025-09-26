import { join } from 'path'
import { exec } from './lib/exec'
import { REPO_ROOT, writeStringFile } from './lib/file'
import { nicelog } from './lib/nicelog'

async function main() {
	const args = process.argv.slice(2)

	if (args.length < 1 || args.length > 2) {
		console.error('Usage: yarn extract-draft-changelog <start-ref> [end-ref]')
		console.error('Example: yarn extract-draft-changelog v2.0.0 HEAD')
		console.error('Example: yarn extract-draft-changelog v2.0.0  # uses current HEAD')
		process.exit(1)
	}

	const startRef = args[0]
	const endRef = args[1] || 'HEAD'

	nicelog(`Extracting changelog from ${startRef} to ${endRef}`)

	try {
		// Get list of commits between the two refs
		const gitLogOutput = await exec(
			'git',
			['log', '--oneline', '--no-merges', `${startRef}..${endRef}`],
			{
				processStdoutLine: () => {}, // Suppress output
				processStderrLine: () => {},
			}
		)

		if (!gitLogOutput.trim()) {
			nicelog('No commits found in the specified range')
			process.exit(0)
		}

		const commitHashes = gitLogOutput
			.split('\n')
			.filter((line) => line.trim())
			.map((line) => line.split(' ')[0])

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

			const lines = fullMessage.trim().split('\n')
			const firstLine = lines[0] || hash
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

			// Only include entries that touch packages/ folder
			const touchesPackages = Array.from(folders).some((folder) => folder.startsWith('packages/'))
			if (touchesPackages) {
				entries.push({
					firstLine,
					restOfMessage: restOfMessage || '_no content_',
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

			output += `# ${label}\n\n`

			for (const entry of entriesForType) {
				output += `## ${entry.firstLine}\n\n`

				if (entry.restOfMessage) {
					output += `${entry.restOfMessage}\n\n`
				}

				output += `---\n\n`
			}
		}

		// Write to changelog.md in the repo root
		const outputPath = join(REPO_ROOT, 'changelog.md')
		await writeStringFile(outputPath, output)

		nicelog(`Draft changelog written to changelog.md (${entries.length} entries)`)
	} catch (error) {
		console.error('Error extracting changelog:', error)
		process.exit(1)
	}
}

main().catch((error) => {
	console.error('Unhandled error:', error)
	process.exit(1)
})
