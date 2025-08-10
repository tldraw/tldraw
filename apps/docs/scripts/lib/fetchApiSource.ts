import fs from 'fs'
import path from 'path'
import { TLDRAW_PACKAGES_TO_INCLUDE_IN_DOCS } from './package-list'

const { log: nicelog } = console

export async function fetchApiSource() {
	try {
		// When running with pnpm -w tsx, we need to find the repo root
		const REPO_ROOT = path.resolve(process.cwd(), fs.existsSync('apps') ? '.' : '../..')
		const API_DIRECTORY = path.join(REPO_ROOT, 'apps', 'docs', 'api')

		if (fs.existsSync(API_DIRECTORY)) {
			fs.rmSync(API_DIRECTORY, { recursive: true })
		}

		fs.mkdirSync(API_DIRECTORY)

		for (const folderName of TLDRAW_PACKAGES_TO_INCLUDE_IN_DOCS) {
			const fromPath = path.join(REPO_ROOT, 'packages', folderName, 'api', 'api.json')
			const toPath = path.join(API_DIRECTORY, folderName + '.api.json')
			fs.copyFileSync(fromPath, toPath)
		}

		nicelog('✔ Complete!')
	} catch (error) {
		nicelog(`x Could not generate site content.`)

		throw error
	}
}
