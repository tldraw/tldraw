import { existsSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { parse } from 'semver'
import { exec } from './lib/exec'
import { makeEnv } from './lib/makeEnv'
import { nicelog } from './lib/nicelog'

// VSCE_PAT needs to be set. It is used by the vsce publish command.
const env = makeEnv(['VSCE_PAT', 'TLDRAW_ENV'])

const EXTENSION_DIR = 'apps/vscode/extension'

async function updateExtensionVersion() {
	const extensionInfoJsonPath = path.join(EXTENSION_DIR, 'extension.json')
	if (!existsSync(extensionInfoJsonPath)) {
		throw new Error('Published extension info not found.')
	}
	const extensionInfoJson = JSON.parse(readFileSync(extensionInfoJsonPath, 'utf8'))
	const version = extensionInfoJson.versions[0].version
	if (!version) {
		throw new Error('Could not get the version of the published extension.')
	}
	const semVer = parse(version)
	if (!semVer) {
		throw new Error('Could not parse the published version.')
	}
	const release = env.TLDRAW_ENV === 'production' ? 'minor' : 'patch'
	const nextVersion = semVer.inc(release).version
	nicelog(`Updating extension version from ${version} to ${nextVersion}`)

	const packageJsonPath = path.join(EXTENSION_DIR, 'package.json')
	if (!existsSync(packageJsonPath)) {
		throw new Error("Could not find the extension's package.json file.")
	}
	const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
	packageJson.version = nextVersion

	writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, '\t') + '\n')
}

async function packageAndPublish() {
	await exec('yarn', ['lazy', 'run', 'build', '--filter=packages/*'])
	switch (env.TLDRAW_ENV) {
		case 'production':
			await exec('yarn', ['package'], { pwd: EXTENSION_DIR })
			await exec('yarn', ['publish'], { pwd: EXTENSION_DIR })
			return
		case 'staging':
			await exec('yarn', ['package', '--pre-release'], { pwd: EXTENSION_DIR })
			await exec('yarn', ['publish', '--pre-release'], { pwd: EXTENSION_DIR })
			return
		default:
			throw new Error('Workflow triggered from a branch other than main or production.')
	}
}

async function main() {
	await updateExtensionVersion()
	await packageAndPublish()
}
main().catch(async (err) => {
	console.error(err)
	process.exit(1)
})
