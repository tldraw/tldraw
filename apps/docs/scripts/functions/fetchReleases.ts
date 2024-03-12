import fs from 'fs'
import { Octokit } from 'octokit'
import path from 'path'

const octokit = new Octokit({
	auth: process.env.ACCESS_TOKEN,
})

const { log: nicelog } = console

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
		})

		if (res.status === 200) {
			nicelog(`• Writing releases...`)
			res.data
				.filter((release) => !release.draft && release.tag_name.startsWith('v2.0.0'))
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

					const filePath = path.join(RELEASES_DIRECTORY, `${release.tag_name}.mdx`)
					fs.writeFileSync(filePath, m)
				})
		} else {
			throw Error(`x Could not get releases for tldraw.`)
		}
	} catch (error) {
		nicelog(`x Could not generate release content.`)

		throw error
	}
}
