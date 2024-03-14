import { writeFileSync } from 'fs'
import tar from 'tar'
import tmp from 'tmp'
import { exec } from './exec'
import { PackageDetails, getAllPackageDetails } from './publishing'

async function hasPackageChanged(pkg: PackageDetails) {
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
		const publishedManifest = await getTarballManifest(publishedTarballPath)

		const localTarballPath = `${dirPath}/local-package.tgz`
		await exec('yarn', ['pack', '--out', localTarballPath], { pwd: pkg.dir })

		const localManifest = await getTarballManifest(localTarballPath)

		return !manifestsAreEqual(publishedManifest, localManifest)
	} finally {
		dir.removeCallback()
	}
}

function manifestsAreEqual(a: Record<string, Buffer>, b: Record<string, Buffer>) {
	const aKeys = Object.keys(a)
	const bKeys = Object.keys(b)
	if (aKeys.length !== bKeys.length) {
		return false
	}
	for (const key of aKeys) {
		if (!bKeys.includes(key)) {
			return false
		}
		if (!a[key].equals(b[key])) {
			return false
		}
	}
	return true
}

function getTarballManifest(tarballPath: string): Promise<Record<string, Buffer>> {
	const manifest: Record<string, Buffer> = {}
	return new Promise((resolve, reject) =>
		tar.list(
			{
				// @ts-expect-error bad typings
				file: tarballPath,
				onentry: (entry) => {
					entry.on('data', (data) => {
						// we could hash these to reduce memory but it's probably fine
						manifest[entry.path] = data
					})
				},
			},
			(err: any) => {
				if (err) {
					reject(err)
				} else {
					resolve(manifest)
				}
			}
		)
	)
}

export async function didAnyPackageChange() {
	const details = getAllPackageDetails()
	for (const pkg of Object.values(details)) {
		if (await hasPackageChanged(pkg)) {
			return true
		}
	}
	return false
}
