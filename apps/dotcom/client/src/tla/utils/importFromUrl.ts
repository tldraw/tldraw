import { createTLSchema, fetch, parseTldrawJsonFile } from 'tldraw'
import type { TldrawApp } from '../app/TldrawApp'

export async function importFromUrl(
	app: TldrawApp,
	url: string
): Promise<{ ok: true; fileId: string } | { ok: false; error: string }> {
	try {
		const res = await fetch(url, { mode: 'cors' })
		if (!res.ok) {
			return { ok: false, error: `Could not fetch: ${res.status} ${res.statusText}` }
		}
		const json = await res.text()
		const parseResult = parseTldrawJsonFile({
			json,
			schema: createTLSchema(),
		})
		if (!parseResult.ok) {
			return { ok: false, error: 'URL did not point to a valid tldraw file' }
		}
		const snapshot = parseResult.value.getStoreSnapshot()
		const documentRecord = Object.values(snapshot.store).find(
			(r): r is import('@tldraw/tlschema').TLDocument => r.typeName === 'document'
		)
		const rawName = documentRecord?.name?.trim()
		const sanitized = rawName?.replace(/[/\\:*?"<>|]/g, '_').slice(0, 200) || 'import'
		const fileName = sanitized.endsWith('.tldr') ? sanitized : `${sanitized}.tldr`
		const file = new File([json], fileName, { type: 'application/json' })
		return new Promise<{ ok: true; fileId: string } | { ok: false; error: string }>((resolve) => {
			const timeout = setTimeout(() => {
				resolve({ ok: false, error: 'Upload timed out' })
			}, 90_000)
			app.uploadTldrFiles([file], (fileId) => {
				clearTimeout(timeout)
				resolve({ ok: true, fileId })
			})
		})
	} catch (e) {
		return {
			ok: false,
			error: e instanceof Error ? e.message : 'Import failed',
		}
	}
}
