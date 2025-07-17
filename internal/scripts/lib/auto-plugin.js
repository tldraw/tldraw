module.exports = class AutoPlugin {
	constructor() {
		this.name = 'tldraw'
	}

	apply(auto) {
		// Exclude bots.
		auto.hooks.onCreateLogParse.tap(this.name, (changelog) =>
			changelog.hooks.omitCommit.tap(this.name, (commit) =>
				commit.authors.some((author) => author.type === 'Bot')
			)
		)

		// Render the release note line and the api changes line, not the commit line.
		auto.hooks.onCreateChangelog.tap(this.name, (changelog) =>
			changelog.hooks.renderChangelogLine.tap(this.name, async (line, commit) => {
				const body = commit.pullRequest.body.replaceAll('\r\n', '\n')

				const parseSection = (sectionHeader) => {
					// Match the section between the header and the next header or any empty line or end of text.
					const match = new RegExp(
						`${sectionHeader}\\n\\n([\\s\\S]*?)(?=\\n### |\\n\\n|$)`,
						'i'
					).exec(body)
					if (!match) return

					const bulletPoints = match[1]
						.split('\n')
						.map((line) => line.trim())
						.filter((line) => line.startsWith('-'))
						.map((line) => line.substring(1).trim())

					if (bulletPoints.length === 0) return

					const prefix = sectionHeader.toLowerCase() === '### api changes' ? '[API Change]: ' : ''
					const formattedPoints = bulletPoints
						.map((point) => {
							return `- ${prefix}${point} [#${commit.pullRequest.number}](https://github.com/tldraw/tldraw/pull/${commit.pullRequest.number})`
						})
						.join('\n')
					output.push(formattedPoints)
				}

				let output = []

				parseSection('### Release Notes')
				parseSection('### API Changes')

				if (output.length > 0) {
					return output.join('\n')
				}

				return line
			})
		)

		// Only write out changelog, not release notes (they're not very good).
		auto.hooks.onCreateChangelog.tap(this.name, (changelog) =>
			changelog.hooks.omitReleaseNotes.tap(this.name, (commit) => true)
		)
	}
}

function uniq(value, index, array) {
	return array.indexOf(value) === index
}
