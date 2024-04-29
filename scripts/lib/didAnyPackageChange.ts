import { writeFileSync } from 'fs'
import * as tar from 'tar'
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
		const publishedManifest = getTarballManifestSync(publishedTarballPath)

		const localTarballPath = `${dirPath}/local-package.tgz`
		await exec('yarn', ['pack', '--out', localTarballPath], { pwd: pkg.dir })

		const localManifest = getTarballManifestSync(localTarballPath)

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

export async function didAnyPackageChange() {
	const details = await getAllPackageDetails()
	for (const pkg of Object.values(details)) {
		if (await hasPackageChanged(pkg)) {
			console.log('Package changed:', pkg.name)
			return true
		}
	}
	return false
}
