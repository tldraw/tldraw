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

		// Render the release note line, not the commit line.
		auto.hooks.onCreateChangelog.tap(this.name, (changelog) =>
			changelog.hooks.renderChangelogLine.tap(this.name, async (line, commit) => {
				const releaseNote = /### Release Notes\n\n-(.*)/g.exec(
					commit.pullRequest.body.replaceAll('\r\n', '\n')
				)
				return releaseNote
					? `- ${releaseNote[1].trim()} [#${commit.pullRequest.number}](https://github.com/tldraw/tldraw/pull/${commit.pullRequest.number})`
					: line
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
