import assert from 'assert'
import * as diff from 'diff'
import { writeFileSync } from 'fs'
import kleur from 'kleur'
import * as tar from 'tar'
import tmp from 'tmp'
import { exec } from './exec'
import { PackageDetails, getAllPackageDetails } from './publishing'

async function getPackageFirstDiff(pkg: PackageDetails): Promise<Diff | null> {
	assert(process.env.TLDRAW_BEMO_URL, 'TLDRAW_BEMO_URL env var must be set')
	const dir = tmp.dirSync({ unsafeCleanup: true })
	const dirPath = dir.name
	try {
		const version = pkg.version

		const unscopedName = pkg.name.replace('@tldraw/', '')
		const url = `https://registry.npmjs.org/${pkg.name}/-/${unscopedName}-${version}.tgz`
		const res = await fetch(url)
		if (res.status >= 400) {
			throw new Error(`Package not found at url ${url}: ${res.status}`)
		}
		const publishedTarballPath = `${dirPath}/published-package.tgz`
		writeFileSync(publishedTarballPath, Buffer.from(await res.arrayBuffer()))
		const publishedManifest = getTarballManifestSync(publishedTarballPath)

		const localTarballPath = `${dirPath}/local-package.tgz`
		await exec('yarn', ['pack', '--out', localTarballPath], { pwd: pkg.dir, env: process.env })

		const localManifest = getTarballManifestSync(localTarballPath)

		return getManifestFirstDiff(pkg.name, publishedManifest, localManifest)
	} finally {
		dir.removeCallback()
	}
}

type Diff =
	| {
			type: 'added' | 'removed'
			packageName: string
			filePath: string
	  }
	| {
			type: 'changed'
			packageName: string
			filePath: string
			diff: string
	  }

function getManifestFirstDiff(
	packageName: string,
	a: Record<string, Buffer>,
	b: Record<string, Buffer>
): Diff | null {
	const aKeys = Object.keys(a)
	const bKeys = Object.keys(b)
	for (const key of aKeys) {
		if (!bKeys.includes(key)) {
			return { type: 'removed', packageName, filePath: key }
		}
		if (!a[key].equals(b[key])) {
			return {
				type: 'changed',
				packageName,
				filePath: key,
				diff: diff.createTwoFilesPatch(key, key, a[key].toString(), b[key].toString()),
			}
		}
	}
	for (const key of bKeys) {
		if (!aKeys.includes(key)) {
			return { type: 'added', packageName, filePath: key }
		}
	}
	return null
}

function getTarballManifestSync(tarballPath: string) {
	const manifest: Record<string, Buffer> = {}
	tar.list({
		file: tarballPath,
		onentry: (entry) => {
			entry.on('data', (data) => {
				// we could hash these to reduce memory but it's probably fine
				const existing = manifest[entry.path]
				if (existing) {
					manifest[entry.path] = Buffer.concat([existing, data])
				} else {
					manifest[entry.path] = data
				}
			})
		},
		sync: true,
	})

	return manifest
}

export function formatDiff(diff: Diff) {
	let message = kleur.cyan().bold(diff.packageName) + ' changed:'
	switch (diff.type) {
		case 'added':
			message += `\n    New file added ${kleur.green().bold(diff.filePath)}`
			break
		case 'removed':
			message += `\n    File removed ${kleur.red().bold(diff.filePath)}`
			break
		case 'changed':
			message += `\n    File changed ${kleur.yellow().bold(diff.filePath)}\n\n`
			message += diff.diff
				.split('\n')
				.map((line) => {
					if (line.startsWith('+')) {
						return kleur.green(line)
					} else if (line.startsWith('-')) {
						return kleur.red(line)
					} else {
						return line
					}
				})
				.join('\n')

			break
	}
	return message
}

export async function getAnyPackageDiff(): Promise<Diff | null> {
	const details = await getAllPackageDetails()
	for (const pkg of Object.values(details)) {
		const diff = await getPackageFirstDiff(pkg)
		if (diff) {
			return diff
		}
	}
	return null
}
