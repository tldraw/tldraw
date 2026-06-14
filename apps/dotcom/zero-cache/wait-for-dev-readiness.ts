/* eslint-disable no-console */
import { DOTCOM_DEV_PORTS, DOTCOM_DEV_READINESS_TIMEOUT_MS } from './dev-env'

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForOk(url: string, label: string) {
	const deadline = Date.now() + DOTCOM_DEV_READINESS_TIMEOUT_MS
	let attempts = 0

	while (Date.now() < deadline) {
		try {
			const response = await fetch(url)
			if (response.ok) return
		} catch {
			// Keep waiting.
		}

		attempts++
		if (attempts === 1 || attempts % 5 === 0) {
			console.log(`Waiting for ${label}...`)
		}
		await delay(1000)
	}

	throw new Error(`Timed out waiting for ${label} at ${url}.`)
}

async function waitForResponse(url: string, label: string) {
	const deadline = Date.now() + DOTCOM_DEV_READINESS_TIMEOUT_MS
	let attempts = 0

	while (Date.now() < deadline) {
		try {
			await fetch(url)
			return
		} catch {
			// Keep waiting.
		}

		attempts++
		if (attempts === 1 || attempts % 5 === 0) {
			console.log(`Waiting for ${label}...`)
		}
		await delay(1000)
	}

	throw new Error(`Timed out waiting for ${label} at ${url}.`)
}

async function main() {
	await waitForOk(`http://localhost:${DOTCOM_DEV_PORTS.migrations}`, 'migrations')
	await waitForOk(`http://localhost:${DOTCOM_DEV_PORTS.zero}/`, 'Zero')
	await waitForResponse(`http://localhost:${DOTCOM_DEV_PORTS.syncWorker}/`, 'sync worker')
	console.log('Dotcom dev dependencies are ready.')
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
