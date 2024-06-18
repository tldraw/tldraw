import { existsSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { exec } from './lib/exec'
import { makeEnv } from './lib/makeEnv'

// VSCE_PAT needs to be set. It is used by the vsce publish command.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const env = makeEnv(['VSCE_PAT'])

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
	const versionSplit = version.split('.')
	versionSplit[2] = Number(versionSplit[2]) + 1
	const nextVersion = versionSplit.join('.')

	const packageJsonPath = path.join(EXTENSION_DIR, 'package.json')
	if (!existsSync(packageJsonPath)) {
		throw new Error("Could not find the extension's package.json file.")
	}
	const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
	packageJson.version = nextVersion

	writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, '\t') + '\n')
}

async function packageAndPublish() {
	await exec('yarn', ['build'])
	await exec('yarn', ['package'], { pwd: EXTENSION_DIR })
	await exec('yarn', ['publish'], { pwd: EXTENSION_DIR })
}

async function main() {
	await updateExtensionVersion()
	await packageAndPublish()
}
main().catch(async (err) => {
	console.error(err)
	process.exit(1)
})
