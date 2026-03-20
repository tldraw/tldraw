import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { parse } from 'semver'
import { exec } from './lib/exec'
import { makeEnv } from './lib/makeEnv'
import { nicelog } from './lib/nicelog'

// VSCE_PAT needs to be set. It is used by the vsce publish command.
// OVSX_PAT needs to be set for Open VSX publishing (handled by publish script).
const env = makeEnv(['VSCE_PAT', 'OVSX_PAT', 'TLDRAW_ENV'])

const EXTENSION_DIR = 'apps/vscode/extension'
const DISTRIBUTION_DIR = 'apps/vscode/extension/release'
const MAX_RETRIES = 5
const RETRY_DELAY_MS = 60_000

function isVersionConflictError(err: unknown): boolean {
	const message = err instanceof Error ? err.message : ''
	const stderr = typeof (err as any)?.stderr === 'string' ? (err as any).stderr : ''
	return message.includes('already exists') || stderr.includes('already exists')
}

async function fetchMarketplaceVersion(): Promise<string> {
	await exec('yarn', ['get-info'], { pwd: EXTENSION_DIR })
	const extensionInfoJsonPath = path.join(EXTENSION_DIR, 'extension.json')
	if (!existsSync(extensionInfoJsonPath)) {
		throw new Error('Published extension info not found.')
	}
	const extensionInfoJson = JSON.parse(readFileSync(extensionInfoJsonPath, 'utf8'))
	const version = extensionInfoJson.versions[0].version
	if (!version) {
		throw new Error('Could not get the version of the published extension.')
	}
	return version
}

async function bumpVersion(): Promise<string> {
	const currentVersion = await fetchMarketplaceVersion()
	const semVer = parse(currentVersion)
	if (!semVer) {
		throw new Error(`Could not parse the published version: ${currentVersion}`)
	}
	const release = env.TLDRAW_ENV === 'production' ? 'minor' : 'patch'
	const nextVersion = semVer.inc(release).version
	nicelog(`Bumping extension version from ${currentVersion} to ${nextVersion}`)

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

async function main() {
	if (env.TLDRAW_ENV !== 'production' && env.TLDRAW_ENV !== 'staging') {
		throw new Error('Workflow triggered from a branch other than main or production.')
	}

	await exec('yarn', ['lazy', 'run', 'build', '--filter=packages/*'])

	// When two pushes to main happen in quick succession, the concurrency group serializes
	// the runs but the marketplace API has propagation delay — both runs can compute the same
	// next version. If publish fails with "already exists", re-fetch and retry.
	for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		const version = await bumpVersion()

		try {
			switch (env.TLDRAW_ENV) {
				case 'production':
					await exec('yarn', ['package'], { pwd: EXTENSION_DIR })
					await exec('yarn', ['publish'], { pwd: EXTENSION_DIR })
					await copyExtensionToReleaseFolder(version)
					return
				case 'staging':
					await exec('yarn', ['package', '--pre-release'], { pwd: EXTENSION_DIR })
					await exec('yarn', ['publish', '--pre-release'], { pwd: EXTENSION_DIR })
					return
			}
		} catch (err) {
			if (isVersionConflictError(err) && attempt < MAX_RETRIES) {
				nicelog(
					`Version conflict detected (attempt ${attempt}/${MAX_RETRIES}), retrying in ${RETRY_DELAY_MS / 1000}s...`
				)
				await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
				continue
			}
			throw err
		}
	}
}

main().catch(async (err) => {
	console.error(err)
	process.exit(1)
})
