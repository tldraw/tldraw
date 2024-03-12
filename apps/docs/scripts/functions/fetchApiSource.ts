import fs from 'fs'
import { Octokit } from 'octokit'
import path from 'path'
import { TLDRAW_PACKAGES_TO_INCLUDE_IN_DOCS } from './package-list'

const octokit = new Octokit({
	auth: process.env.ACCESS_TOKEN,
})

const { log: nicelog } = console

export async function fetchApiSource() {
	try {
		const API_DIRECTORY = path.join(process.cwd(), 'api')

		if (fs.existsSync(API_DIRECTORY)) {
			fs.rmSync(API_DIRECTORY, { recursive: true })
		}

		fs.mkdirSync(API_DIRECTORY)

		for (const folderName of TLDRAW_PACKAGES_TO_INCLUDE_IN_DOCS) {
			const filePath = path.join(API_DIRECTORY, folderName + '.api.json')

			nicelog(`• Fetching API for ${folderName}...`)

			const res = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
				owner: 'tldraw',
				repo: 'tldraw',
				path: `packages/${folderName}/api/api.json`,
				branch: process.env.SOURCE_SHA || 'main',
				headers: {
					'X-GitHub-Api-Version': '2022-11-28',
					accept: 'application/vnd.github.VERSION.raw',
				},
			})

			if (res.status === 200) {
				nicelog(`• Writing ${filePath}...`)
				fs.writeFileSync(filePath, (res as any).data)
			} else {
				throw Error(`x Could not get API for ${folderName}.`)
			}
		}

		nicelog('✔ Complete!')
	} catch (error) {
		nicelog(`x Could not generate site content.`)

		throw error
	}
}
