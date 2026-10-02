import { execSync } from 'child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import path, { join } from 'path'
import { Octokit } from '@octokit/rest'
import { fetch } from 'cross-fetch'
import { glob } from 'glob'
import { parse } from 'semver'
import { exec } from './exec'
import { REPO_ROOT } from './file'
import { nicelog } from './nicelog'
import { getAllWorkspacePackages } from './workspace'

export interface PackageDetails {
	name: string
	dir: string
	localDeps: string[]
	version: string
}

async function getPackageDetails(dir: string): Promise<PackageDetails | null> {
	const packageJsonPath = path.join(dir, 'package.json')
	if (!existsSync(packageJsonPath)) {
		return null
	}
	const packageJson = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'))
	if (packageJson.private) {
		return null
	}

	const workspacePackages = await getAllWorkspacePackages()
	return {
		name: packageJson.name,
		dir,
		version: packageJson.version,
		localDeps: Object.keys(packageJson.dependencies ?? {}).filter((dep) =>
			workspacePackages.some((p) => p.name === dep)
		),
	}
}

export async function getAllPackageDetails(): Promise<Record<string, PackageDetails>> {
	const dirs = readdirSync(join(REPO_ROOT, 'packages'))
	const details = await Promise.all(
		dirs.map((dir) => getPackageDetails(path.join(REPO_ROOT, 'packages', dir)))
	)
	const results = details.filter((x): x is PackageDetails => Boolean(x))

	return Object.fromEntries(results.map((result) => [result.name, result]))
}

export async function setAllVersions(version: string, options?: { stageChanges?: boolean }) {
	const packages = await getAllPackageDetails()
	for (const packageDetails of Object.values(packages)) {
		const manifest = JSON.parse(readFileSync(path.join(packageDetails.dir, 'package.json'), 'utf8'))
		manifest.version = version
		writeFileSync(
			path.join(packageDetails.dir, 'package.json'),
			JSON.stringify(manifest, null, '\t') + '\n'
		)
	}

	await exec('pnpm', ['refresh-assets', '--force'], { env: { ALLOW_REFRESH_ASSETS_CHANGES: '1' } })

	const lernaJson = JSON.parse(readFileSync('lerna.json', 'utf8'))
	lernaJson.version = version
	writeFileSync('lerna.json', JSON.stringify(lernaJson, null, '\t') + '\n')

	execSync('pnpm install')

	if (options?.stageChanges) {
		await stageAllPackageJsonChanges()
	}
}

async function stageAllPackageJsonChanges() {
	// stage the changes
	const packageJsonFilesToAdd = []
	for (const workspace of await getAllWorkspacePackages()) {
		if (workspace.relativePath.startsWith('packages/')) {
			packageJsonFilesToAdd.push(`${workspace.relativePath}/package.json`)
		}
	}
	const versionFilesToAdd = glob.sync('**/*/version.ts', {
		ignore: ['**/node_modules/**'],
		follow: false,
	})
	console.log('versionFilesToAdd', versionFilesToAdd)
	await exec('git', [
		'add',
		'--update',
		'lerna.json',
		...packageJsonFilesToAdd,
		...versionFilesToAdd,
	])
}

function assertExists<T>(v: T | null | undefined): T {
	if (v === null || v === undefined) throw new Error('Expected value to exist')
	return v
}

export async function getLatestTldrawVersionFromNpm({
	versionPrefix,
}: { versionPrefix?: string } = {}) {
	if (!versionPrefix)
		return assertExists(parse((await exec('npm', ['show', 'tldraw', 'version'])).trim()))

	const versions = (await exec('npm', ['show', 'tldraw@~' + versionPrefix, 'version'])).trim()
	if (versions.startsWith('tldraw')) {
		return assertExists(parse(versions.split('\n').pop()?.split(' ')[1].replaceAll("'", '')))
	}
	return assertExists(parse(versions))
}

function topologicalSortPackages(packages: Record<string, PackageDetails>) {
	const sorted: PackageDetails[] = []
	const visited = new Set<string>()

	function visit(packageName: string, path: string[]) {
		if (visited.has(packageName)) {
			return
		}
		visited.add(packageName)
		const packageDetails = packages[packageName]
		if (!packageDetails) {
			throw new Error(`Could not find package ${packageName}. path: ${path.join(' -> ')}`)
		}
		packageDetails.localDeps.forEach((dep) => visit(dep, [...path, dep]))
		sorted.push(packageDetails)
	}

	Object.keys(packages).forEach((packageName) => visit(packageName, [packageName]))

	return sorted
}

export async function publish(distTag?: string) {
	// Authentication uses npm's trusted publisher OIDC flow. The publish job in
	// CI must grant `permissions: id-token: write` so pnpm (>= 10.13, which we are
	// on via `packageManager`) can exchange the GitHub-issued OIDC token for a
	// short-lived publish token automatically.
	//
	// We invoke `pnpm publish` rather than `npm publish` directly so that
	// pnpm rewrites `workspace:*` dependency specifiers in the published
	// tarball into the concrete sibling versions. `npm publish` has no concept
	// of pnpm's workspace protocol and would ship `"workspace:*"` literally,
	// breaking installs for any consumer outside this monorepo.
	// See https://docs.npmjs.com/trusted-publishers
	const packages = await getAllPackageDetails()

	const publishOrder = topologicalSortPackages(packages)

	// npm can take several minutes before a published version is readable. Waiting only
	// on a package's own dependencies keeps a newly visible package installable, without
	// making the run wait for every package's delay in turn.
	const readable = new Map<string, Promise<void>>()

	for (const packageDetails of publishOrder) {
		await Promise.all(packageDetails.localDeps.map((dep) => readable.get(dep)))

		const tag = distTag ?? parse(packageDetails.version)?.prerelease[0] ?? 'latest'

		// Yarn's --tolerate-republish looked the version up and exited 0 if it already
		// existed; pnpm has no equivalent (its --force is the opposite), it just uploads
		// and gets a 403. Re-running a partly successful release depends on this skip.
		if (await isPublished(packageDetails)) {
			nicelog(
				`[publish] ${packageDetails.name}@${packageDetails.version} already published, skipping`
			)
			readable.set(packageDetails.name, Promise.resolve())
			continue
		}

		nicelog(
			`Publishing ${packageDetails.name} with version ${packageDetails.version} under tag @${tag}`
		)

		await retry(
			async () => {
				let output = ''
				const publishStart = Date.now()
				nicelog(
					`[publish] ${packageDetails.name}@${packageDetails.version} starting npm publish...`
				)
				try {
					await exec(
						`pnpm`,
						[
							'publish',
							'--tag',
							String(tag),
							// Releases publish from release branches with generated files in the
							// tree, which pnpm's default branch/clean checks would reject.
							'--no-git-checks',
							'--provenance',
							'--access',
							'public',
						],
						{
							pwd: packageDetails.dir,
							processStdoutLine: (line) => {
								output += line + '\n'
								nicelog(line)
							},
							processStderrLine: (line) => {
								output += line + '\n'
								nicelog(line)
							},
						}
					)
				} catch (e) {
					// A retry after a publish that actually landed is rejected as "published",
					// or as "staged" (409) while npm is still processing the first attempt.
					// pnpm wraps its error at ~80 columns and prefixes wrapped lines with `│`,
					// so the phrase can straddle a line break depending on the name's length.
					const lowerOutput = output
						.toLowerCase()
						.replace(/[│╰─▶×]/g, ' ')
						.replace(/\s+/g, ' ')
					if (
						lowerOutput.includes('cannot publish over the previously published versions') ||
						lowerOutput.includes('cannot publish over previously staged version')
					) {
						nicelog(
							`[publish] ${packageDetails.name}@${packageDetails.version} already published or staged, skipping`
						)
						return
					}
					throw e
				}
				const elapsed = ((Date.now() - publishStart) / 1000).toFixed(1)
				nicelog(
					`[publish] ${packageDetails.name}@${packageDetails.version} npm publish done (${elapsed}s)`
				)
			},
			{
				delay: 10_000,
				numAttempts: 5,
			}
		)

		const whenReadable = waitUntilReadable(packageDetails)
		// Rejections surface when awaited below; without this, one arriving mid-loop would
		// kill the process in the middle of another package's publish.
		whenReadable.catch(() => {})
		readable.set(packageDetails.name, whenReadable)
	}

	await Promise.all(readable.values())
}

function registryUrl(packageDetails: PackageDetails) {
	return `https://registry.npmjs.org/${packageDetails.name}/${packageDetails.version}`
}

async function isPublished(packageDetails: PackageDetails) {
	const res = await fetch(registryUrl(packageDetails), { method: 'HEAD' })
	return res.status < 400
}

function waitUntilReadable(packageDetails: PackageDetails) {
	const url = registryUrl(packageDetails)
	return retry(
		async ({ attempt, total }) => {
			const res = await fetch(url, { method: 'HEAD' })
			if (res.status >= 400) {
				nicelog(
					`[verify] ${packageDetails.name}@${packageDetails.version} not readable yet (${res.status}), attempt ${attempt + 1} of ${total}`
				)
				throw new Error(`Package not found: ${url} (${res.status})`)
			}
			nicelog(`[verify] ${packageDetails.name}@${packageDetails.version} is readable`)
		},
		{
			delay: 10_000,
			// 15 minutes; the slowest package took over 8 minutes in September 2026.
			numAttempts: 90,
		}
	)
}

function retry(
	fn: (args: { attempt: number; remaining: number; total: number }) => Promise<void>,
	opts: {
		numAttempts: number
		delay: number
	}
): Promise<void> {
	return new Promise((resolve, reject) => {
		let attempts = 0
		function attempt() {
			fn({ attempt: attempts, remaining: opts.numAttempts - attempts, total: opts.numAttempts })
				.then(resolve)
				.catch((err) => {
					attempts++
					if (attempts >= opts.numAttempts) {
						reject(err)
					} else {
						setTimeout(attempt, opts.delay)
					}
				})
		}
		attempt()
	})
}

export async function publishProductionDocsAndExamplesAndBemo({
	gitRef = 'HEAD',
}: { gitRef?: string } = {}) {
	await exec('git', ['push', 'origin', `${gitRef}:docs-production`, `--force`])
	await exec('git', ['push', 'origin', `${gitRef}:bemo-production`, `--force`])
}

export async function triggerBumpVersionsWorkflow(ghToken: string) {
	const octokit = new Octokit({ auth: ghToken })
	await octokit.rest.actions.createWorkflowDispatch({
		owner: 'tldraw',
		repo: 'tldraw',
		workflow_id: 'bump-versions.yml',
		ref: 'main',
	})
}
