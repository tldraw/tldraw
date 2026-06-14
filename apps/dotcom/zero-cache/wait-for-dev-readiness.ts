/* eslint-disable no-console */
import {
	DOTCOM_DEV_MIGRATIONS_READY_TIMEOUT_MS,
	DOTCOM_DEV_PORTS,
	DOTCOM_DEV_READINESS_TIMEOUT_MS,
} from './dev-env'

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForResponse({
	url,
	label,
	timeoutMs,
	requireOk,
}: {
	url: string
	label: string
	timeoutMs: number
	requireOk: boolean
}) {
	const deadline = Date.now() + timeoutMs
	let attempts = 0

	while (Date.now() < deadline) {
		try {
			const response = await fetch(url)
			if (!requireOk || response.ok) return
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
	await waitForResponse({
		url: `http://localhost:${DOTCOM_DEV_PORTS.migrations}`,
		label: 'migrations',
		timeoutMs: DOTCOM_DEV_MIGRATIONS_READY_TIMEOUT_MS,
		requireOk: true,
	})
	await waitForResponse({
		url: `http://localhost:${DOTCOM_DEV_PORTS.zero}/`,
		label: 'Zero',
		timeoutMs: DOTCOM_DEV_READINESS_TIMEOUT_MS,
		requireOk: true,
	})
	await waitForResponse({
		url: `http://localhost:${DOTCOM_DEV_PORTS.syncWorker}/`,
		label: 'sync worker',
		timeoutMs: DOTCOM_DEV_READINESS_TIMEOUT_MS,
		requireOk: false,
	})
	console.log('Dotcom dev dependencies are ready.')
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
