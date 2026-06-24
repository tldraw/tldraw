#!/usr/bin/env node
/* eslint-disable no-console */
//
// The `process-compose` bin of @tldraw/scripts: self-provisioning process-compose.
//
// process-compose has no npm package, so installing it is normally a separate brew/curl step. Exposing
// it as a workspace bin lets `yarn dev-app` (and anything else) call `process-compose` like any other
// tool; on first use this downloads the pinned binary into node_modules/.cache, then execs it. Caching
// it there (rather than a top-level dir) treats it like any bundled-binary dep: nuking node_modules
// re-fetches it. Only people who actually run the dotcom stack pay the one-time download (Yarn doesn't
// run a workspace's postinstall, so the fetch is lazy rather than eager).

const { spawn, spawnSync } = require('node:child_process')
const { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require('node:fs')
const { arch: osArch, platform: osPlatform } = require('node:os')
const { join } = require('node:path')

// Bump this to upgrade process-compose for everyone; the next `yarn dev-app` re-downloads.
const VERSION = 'v1.116.0'

const repoRoot = join(__dirname, '..', '..')
const binDir = join(repoRoot, 'node_modules', '.cache', 'process-compose')
const binPath = join(binDir, 'process-compose')
const stampPath = join(binDir, '.version')

function releaseAsset() {
	const os = osPlatform()
	if (os !== 'darwin' && os !== 'linux') {
		throw new Error(
			`process-compose auto-install only supports macOS and Linux (got ${os}). ` +
				`Install it manually: https://f1bonacc1.github.io/process-compose/installation/`
		)
	}
	const arch = osArch() === 'arm64' ? 'arm64' : 'amd64' // map node's "x64" -> release "amd64"
	return `process-compose_${os}_${arch}.tar.gz`
}

async function ensureBinary() {
	const installed =
		existsSync(binPath) &&
		existsSync(stampPath) &&
		readFileSync(stampPath, 'utf8').trim() === VERSION
	if (installed) return

	const asset = releaseAsset()
	const url = `https://github.com/F1bonacc1/process-compose/releases/download/${VERSION}/${asset}`
	console.error(`Fetching process-compose ${VERSION} (${asset})…`)

	const res = await fetch(url, { redirect: 'follow' })
	if (!res.ok) {
		throw new Error(`Failed to download process-compose: ${res.status} ${res.statusText} (${url})`)
	}

	mkdirSync(binDir, { recursive: true })
	const tgz = join(binDir, asset)
	writeFileSync(tgz, Buffer.from(await res.arrayBuffer()))
	// The tarball contains the `process-compose` binary at its root. tar ships on macOS and Linux.
	const untar = spawnSync('tar', ['-xzf', tgz, '-C', binDir, 'process-compose'], {
		stdio: 'inherit',
	})
	rmSync(tgz, { force: true })
	if (untar.status !== 0) throw new Error('Failed to extract the process-compose archive')
	chmodSync(binPath, 0o755)
	writeFileSync(stampPath, VERSION)
	console.error(`process-compose ${VERSION} ready (${binPath})`)
}

async function main() {
	await ensureBinary()

	const child = spawn(binPath, process.argv.slice(2), { stdio: 'inherit' })
	const forward = (signal) => {
		if (!child.killed) child.kill(signal)
	}
	process.on('SIGINT', () => forward('SIGINT'))
	process.on('SIGTERM', () => forward('SIGTERM'))
	process.on('SIGHUP', () => forward('SIGHUP'))
	child.on('error', (error) => {
		console.error(error)
		process.exit(1)
	})
	child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)))
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
