import { execSync } from 'child_process'
import { fetch } from 'cross-fetch'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import path, { join } from 'path'
import { compare, parse } from 'semver'
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

export async function setAllVersions(version: string) {
	const packages = await getAllPackageDetails()
	for (const packageDetails of Object.values(packages)) {
		const manifest = JSON.parse(readFileSync(path.join(packageDetails.dir, 'package.json'), 'utf8'))
		manifest.version = version
		writeFileSync(
			path.join(packageDetails.dir, 'package.json'),
			JSON.stringify(manifest, null, '\t') + '\n'
		)
	}

	await exec('yarn', ['refresh-assets', '--force'], { env: { ALLOW_REFRESH_ASSETS_CHANGES: '1' } })

	const lernaJson = JSON.parse(readFileSync('lerna.json', 'utf8'))
	lernaJson.version = version
	writeFileSync('lerna.json', JSON.stringify(lernaJson, null, '\t') + '\n')

	execSync('yarn')
}

export async function getLatestVersion() {
	const packages = await getAllPackageDetails()

	const allVersions = Object.values(packages).map((p) => parse(p.version)!)
	allVersions.sort(compare)

	const latestVersion = allVersions[allVersions.length - 1]

	if (!latestVersion) {
		throw new Error('Could not find latest version')
	}

	return latestVersion
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
	const npmToken = process.env.NPM_TOKEN
	if (!npmToken) {
		throw new Error('NPM_TOKEN not set')
	}

	execSync(`yarn config set npmAuthToken ${npmToken}`, { stdio: 'inherit' })
	execSync(`yarn config set npmRegistryServer https://registry.npmjs.org`, { stdio: 'inherit' })

	const packages = await getAllPackageDetails()

	const publishOrder = topologicalSortPackages(packages)

	for (const packageDetails of publishOrder) {
		const tag = distTag ?? parse(packageDetails.version)?.prerelease[0] ?? 'latest'
		nicelog(
			`Publishing ${packageDetails.name} with version ${packageDetails.version} under tag @${tag}`
		)

		await retry(
			async () => {
				let output = ''
				try {
					await exec(
						`yarn`,
						['npm', 'publish', '--tag', String(tag), '--tolerate-republish', '--access', 'public'],
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
					if (output.includes('You cannot publish over the previously published versions')) {
						// --tolerate-republish seems to not work for canary versions??? so let's just ignore this error
						return
					}
					throw e
				}
			},
			{
				delay: 10_000,
				numAttempts: 5,
			}
		)

		await retry(
			async ({ attempt, total }) => {
				nicelog('Waiting for package to be published... attempt', attempt, 'of', total)
				// fetch the new package directly from the npm registry
				const newVersion = packageDetails.version

				const url = `https://registry.npmjs.org/${packageDetails.name}/${newVersion}`
				nicelog('looking for package at url: ', url)
				const res = await fetch(url, {
					method: 'HEAD',
				})
				if (res.status >= 400) {
					throw new Error(`Package not found: ${res.status}`)
				}
			},
			{
				delay: 10000,
				numAttempts: 50,
			}
		)
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
