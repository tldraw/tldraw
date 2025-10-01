import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { parse } from 'semver'
import { exec } from './lib/exec'
import { makeEnv } from './lib/makeEnv'
import { nicelog } from './lib/nicelog'

// VSCE_PAT needs to be set. It is used by the vsce publish command.
const env = makeEnv(['VSCE_PAT', 'TLDRAW_ENV'])

const EXTENSION_DIR = 'apps/vscode/extension'
const DISTRIBUTION_DIR = 'apps/vscode/extension/release'

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
	return nextVersion
}

async function copyExtensionToReleaseFolder(version: string) {
	if (!existsSync(DISTRIBUTION_DIR)) {
		mkdirSync(DISTRIBUTION_DIR, { recursive: true })
	}

	const tempDir = path.join(EXTENSION_DIR, 'temp')
	if (!existsSync(tempDir)) {
		throw new Error(
			'Extension temp directory not found. Make sure packaging completed successfully.'
		)
	}

	const files = readdirSync(tempDir)
	const vsixFile = files.find((file: string) => file.endsWith('.vsix'))
	if (!vsixFile) {
		throw new Error('No .vsix file found in temp directory.')
	}

	const sourcePath = path.join(tempDir, vsixFile)
	const targetPath = path.join(DISTRIBUTION_DIR, 'tldraw-vscode.vsix')

	nicelog(`Copying extension from ${sourcePath} to ${targetPath}`)
	copyFileSync(sourcePath, targetPath)

	nicelog('Setting git user identity...')
	await exec('git', ['config', 'user.name', 'huppy-bot[bot]'])
	await exec('git', ['config', 'user.email', '128400622+huppy-bot[bot]@users.noreply.github.com'])

	nicelog('Committing extension to git...')
	await exec('git', ['add', '-f', targetPath])
	await exec('git', ['commit', '-m', `Add VSCode extension v${version} [skip ci]`])
	nicelog('Pushing changes to remote repository...')
	await exec('git', ['push'])
}

async function packageAndPublish(version: string) {
	await exec('yarn', ['lazy', 'run', 'build', '--filter=packages/*'])
	switch (env.TLDRAW_ENV) {
		case 'production':
			await exec('yarn', ['package'], { pwd: EXTENSION_DIR })
			await copyExtensionToReleaseFolder(version)
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
	const version = await updateExtensionVersion()
	await packageAndPublish(version)
}
main().catch(async (err) => {
	console.error(err)
	process.exit(1)
})
