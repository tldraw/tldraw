import { assert } from '@/utils/assert'
import fs from 'fs'
import { Octokit } from 'octokit'
import path from 'path'

const octokit = new Octokit({})

const { log: nicelog } = console

const CHANGELOG_START_TAG = '{/* START AUTO-GENERATED CHANGELOG */}'
const CHANGELOG_END_TAG = '{/* END AUTO-GENERATED CHANGELOG */}'

export async function fetchReleases() {
	try {
		const RELEASES_DIRECTORY = path.join(process.cwd(), 'content', 'releases')

		if (fs.existsSync(RELEASES_DIRECTORY)) {
			fs.rmSync(RELEASES_DIRECTORY, { recursive: true })
		}

		fs.mkdirSync(RELEASES_DIRECTORY)

		const res = await octokit.rest.repos.listReleases({
			owner: 'tldraw',
			repo: 'tldraw',
			per_page: 100,
		})

		const changelogIndex: { tagName: string; body: string }[] = []

		if (res.status === 200) {
			nicelog(`• Writing releases...`)
			res.data
				.filter(
					(release) =>
						// no drafts
						!release.draft &&
						// no v1 releases
						!release.tag_name.startsWith('v1') &&
						// no pre-releases
						!release.tag_name.includes('-')
				)
				.forEach((release, i) => {
					const date = (
						release.published_at ? new Date(release.published_at) : new Date()
					).toLocaleDateString('en-US', {
						year: 'numeric',
						month: 'numeric',
						day: 'numeric',
					})

					let m = ''

					m += `---\n`
					m += `title: ${release.tag_name}\n`
					m += `description: Examples\n`
					m += `author: tldraw\n`
					m += `date: ${date}\n`
					m += `order: ${i}\n`
					m += `status: published\n`
					m += `---\n\n`
					m += `[View on GitHub](${release.html_url})\n\n`

					const body = (release.body ?? '')
						.replaceAll(/### Release Notes\n/g, '')
						.replaceAll(/\[([^\]]+)\]$/g, '$1')
						.replace(/<image (.*)">/g, '<image $1" />')
						.replace(/<([^>]+)\/?>(?=\s|$)/g, '`<$1>`')
						.replace(/`<image(.*) \/>`/g, '<image$1 />')
						.replace(/`<img(.*) \/>`/g, '<img$1 />')
						.replace(/\/\/>/g, '/>')

					m += body

					changelogIndex.push({
						tagName: release.tag_name,
						body,
					})

					const filePath = path.join(RELEASES_DIRECTORY, `${release.tag_name}.mdx`)
					fs.writeFileSync(filePath, m)
				})
			nicelog(`• Writing changelog...`)

			const releasesPagePath = path.join(
				process.cwd(),
				'content',
				'getting-started',
				'releases-versioning.mdx'
			)
			const releasesPageContent = fs.readFileSync(releasesPagePath, 'utf-8')

			const startIndex = releasesPageContent.indexOf(CHANGELOG_START_TAG)
			assert(startIndex !== -1, 'cannot find start tag')

			const endIndex = releasesPageContent.indexOf(CHANGELOG_END_TAG)
			assert(endIndex !== -1, 'cannot find end tag')

			const contentBefore = releasesPageContent.slice(0, startIndex)
			const contentAfter = releasesPageContent.slice(endIndex + CHANGELOG_END_TAG.length)

			const changelogIndexMarkdown = changelogIndex
				.sort((a, b) => b.tagName.localeCompare(a.tagName))
				.map(({ body, tagName }, i) => {
					if (i >= 10) {
						return `### [${tagName}](/releases/${tagName})`
					} else {
						return [`### [${tagName}](/releases/${tagName})`, body].join('\n\n')
					}
				})
				.join('\n\n')

			const updatedContent = [
				contentBefore,
				CHANGELOG_START_TAG,
				changelogIndexMarkdown,
				CHANGELOG_END_TAG,
				contentAfter,
			].join('\n\n')

			fs.writeFileSync(releasesPagePath, updatedContent, 'utf-8')
		} else {
			throw Error(`x Could not get releases for tldraw.`)
		}
	} catch (error) {
		nicelog(`x Could not generate release content.`)

		throw error
	}
}
