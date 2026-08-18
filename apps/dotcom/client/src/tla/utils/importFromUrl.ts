import { TLDocument, createTLSchema, fetch, parseTldrawJsonFile } from 'tldraw'
import type { TldrawApp } from '../app/TldrawApp'

type ImportResult =
	| { ok: true; fileId: string }
	| { ok: false; error: string; toastAlreadyShown?: boolean }

export async function importFromUrl(app: TldrawApp, url: string): Promise<ImportResult> {
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
			(r): r is TLDocument => r.typeName === 'document'
		)
		const rawName = documentRecord?.name?.trim()
		const sanitized = rawName?.replace(/[/\\:*?"<>|]/g, '_').slice(0, 200) || 'import'
		const fileName = sanitized.endsWith('.tldr') ? sanitized : `${sanitized}.tldr`
		const file = new File([json], fileName, { type: 'application/json' })
		return new Promise<ImportResult>((resolve) => {
			app.uploadTldrFiles(
				[file],
				(fileId) => resolve({ ok: true, fileId }),
				undefined,
				() => resolve({ ok: false, error: 'Upload failed', toastAlreadyShown: true })
			)
		})
	} catch (e) {
		return {
			ok: false,
			error: e instanceof Error ? e.message : 'Import failed',
		}
	}
}
