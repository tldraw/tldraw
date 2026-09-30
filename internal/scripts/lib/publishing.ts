import { execSync } from 'child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path, { join } from 'path'
import { Octokit } from '@octokit/rest'
import { fetch } from 'cross-fetch'
import { glob } from 'glob'
import { parse } from 'semver'
import { exec, prefixOutput } from './exec'
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

	// Everything publishes under a holding tag so no tag resolves to the new version
	// until the whole set is readable. Otherwise a release that dies partway leaves some
	// packages' `latest` moved and the rest not, and npm's minutes-long publish-to-read
	// delay lets a dependent resolve while its pinned dependencies still 404.
	// See https://github.com/tldraw/tldraw/actions/runs/36699898990.
	const userconfig = writeDistTagNpmrc()

	try {
		for (const packageDetails of publishOrder) {
			const tag = holdingTag(packageDetails)

			// pnpm has no equivalent of yarn's --tolerate-republish (its --force is the
			// opposite), it just uploads and gets a 403. Re-running a partly successful
			// release depends on this skip.
			if (await isPublished(packageDetails)) {
				nicelog(
					`[publish] ${packageDetails.name}@${packageDetails.version} already published, skipping`
				)
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
		}

		await Promise.all(publishOrder.map((packageDetails) => waitUntilReadable(packageDetails)))

		await Promise.all(
			publishOrder.map((packageDetails) => {
				const tag = String(distTag ?? parse(packageDetails.version)?.prerelease[0] ?? 'latest')
				return moveDistTag(packageDetails, tag, userconfig)
			})
		)

		await Promise.all(
			publishOrder.map((packageDetails) => removeHoldingTag(packageDetails, userconfig))
		)
	} finally {
		rmSync(userconfig, { force: true })
	}
}

function holdingTag(packageDetails: PackageDetails) {
	// npm rejects a tag that parses as a semver range, so this can't be the bare version.
	return `pending-${packageDetails.version}`
}

function versionUrl(packageDetails: PackageDetails) {
	return `https://registry.npmjs.org/${packageDetails.name}/${packageDetails.version}`
}

async function isPublished(packageDetails: PackageDetails) {
	const res = await fetch(versionUrl(packageDetails), { method: 'HEAD' })
	return res.status < 400
}

/**
 * The version document and the package document are separate registry endpoints with
 * separate caches, and the package document is the one `npm dist-tag` writes to and
 * installs resolve against. Tagging a version the package document doesn't list yet
 * fails, so both have to be readable before the tags move.
 */
function waitUntilReadable(packageDetails: PackageDetails) {
	const { name, version } = packageDetails
	return retry(
		async ({ attempt, total }) => {
			const [versionRes, packumentRes] = await Promise.all([
				fetch(versionUrl(packageDetails), { method: 'HEAD' }),
				fetch(`https://registry.npmjs.org/${name}`, {
					headers: { accept: 'application/vnd.npm.install-v1+json' },
				}),
			])
			const listed =
				packumentRes.status < 400 &&
				Boolean(
					((await packumentRes.json()) as { versions?: Record<string, unknown> }).versions?.[
						version
					]
				)

			if (versionRes.status >= 400 || !listed) {
				nicelog(
					`[verify] ${name}@${version} not readable yet (version ${versionRes.status}, listed ${listed}), attempt ${attempt + 1} of ${total}`
				)
				throw new Error(
					`Package not readable: ${name}@${version} (version ${versionRes.status}, listed in package document: ${listed})`
				)
			}
			nicelog(`[verify] ${name}@${version} is readable`)
		},
		{
			delay: 10_000,
			// 20 minutes. tldraw@5.5.0 was still missing after 15 in September 2026.
			numAttempts: 120,
		}
	)
}

/**
 * npm's trusted publishing OIDC credential authorizes `npm publish` and nothing else, so
 * moving a tag needs a granular token. Keeping it in a config file passed only to the
 * dist-tag calls stops it being picked up in place of OIDC during publishing.
 */
function writeDistTagNpmrc() {
	if (!process.env.NPM_TOKEN) {
		throw new Error('NPM_TOKEN is required to move dist-tags after publishing')
	}
	const file = join(mkdtempSync(join(tmpdir(), 'tldraw-publish-')), '.npmrc')
	// npm expands the variable itself, so the token never lands on disk.
	writeFileSync(file, '//registry.npmjs.org/:_authToken=${NPM_TOKEN}\n', { mode: 0o600 })
	return file
}

async function moveDistTag(packageDetails: PackageDetails, tag: string, userconfig: string) {
	const { name, version } = packageDetails
	nicelog(`[tag] ${name}@${version} -> @${tag}`)
	await exec('npm', ['dist-tag', 'add', `${name}@${version}`, tag, '--userconfig', userconfig], {
		...prefixOutput(`[tag] ${name}: `),
	})
}

async function removeHoldingTag(packageDetails: PackageDetails, userconfig: string) {
	const tag = holdingTag(packageDetails)
	try {
		await exec('npm', ['dist-tag', 'rm', packageDetails.name, tag, '--userconfig', userconfig], {
			...prefixOutput(`[tag] ${packageDetails.name}: `),
		})
	} catch (e) {
		// The release is already complete and correctly tagged by this point; a leftover
		// holding tag is cosmetic, so don't fail the run over it.
		nicelog(`[tag] could not remove @${tag} from ${packageDetails.name}: ${e}`)
	}
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
