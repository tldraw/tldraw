import { Editor, LocalIndexedDb, TAB_ID, TLAsset, getFromLocalStorage } from 'tldraw'
import { SCRATCH_PERSISTENCE_KEY } from '../../utils/scratch-persistence-key'

export const TEMPORARY_FILE_KEY = 'TLA_TEMPORARY_FILE_ID_1'
export const TLA_WAS_LEGACY_CONTENT_MIGRATED = 'TLA_WAS_LEGACY_CONTENT_MIGRATED'
export const LOCAL_LEGACY_SLUG = 'local_legacy'
export const LOCAL_LEGACY_SUFFIX = '_legacy'

export async function migrateLegacyContent(editor: Editor, abortSignal: AbortSignal) {
	const db = new LocalIndexedDb(SCRATCH_PERSISTENCE_KEY)
	const data = await db.load({ sessionId: TAB_ID })
	if (abortSignal.aborted) return
	// Assets will be served from the local indexedDb while they are being uploaded
	editor.loadSnapshot({
		document: {
			schema: data.schema,
			store: Object.fromEntries(data.records.map((r) => [r.id, r])),
		},
		session: data.sessionStateSnapshot,
	})
}

// Need to do this check as fast as possible. This method takes about 30-60ms while using our
// indexedDb wrapper takes closer to 150ms to run.
export async function hasMeaningfulLegacyContent() {
	try {
		const wasLegacyContentAlreadyMigrated =
			getFromLocalStorage(TLA_WAS_LEGACY_CONTENT_MIGRATED) === 'true'
		if (wasLegacyContentAlreadyMigrated) return false

		return await new Promise<boolean>((resolve, reject) => {
			const request = indexedDB.open('TLDRAW_DOCUMENT_v2' + SCRATCH_PERSISTENCE_KEY)

			request.onerror = reject

			request.onsuccess = () => {
				const db = request.result
				const transaction = db.transaction(['records'], 'readonly')
				const objectStore = transaction.objectStore('records')
				const query = objectStore.count()

				query.onsuccess = () => {
					// one page record, one document record, one shape record = 3 records
					resolve(query.result >= 3)
				}

				query.onerror = reject
			}
		})
	} catch (_e) {
		return false
	}
}

const localFileCache = new WeakMap<TLAsset, { file: File; url: string }>()

export async function loadLocalFile(asset: TLAsset): Promise<{ file: File; url: string } | null> {
	const existing = localFileCache.get(asset)
	if (existing) return existing

	const db = new LocalIndexedDb(SCRATCH_PERSISTENCE_KEY)
	try {
		const file = await db.getAsset(asset.id)
		if (!file) return null
		const url = URL.createObjectURL(file)
		const result = { file, url }
		localFileCache.set(asset, result)
		return result
	} finally {
		db.close()
	}
}

export async function uploadLegacyFiles(editor: Editor, abortSignal: AbortSignal) {
	const assets$ = editor.store.query.records('asset')
	let asset: TLAsset | undefined
	while (
		!abortSignal.aborted &&
		(asset = assets$.get().find((a) => a.props.src?.startsWith('asset:')))
	) {
		const res = await loadLocalFile(asset)
		if (abortSignal.aborted) return
		if (!res) return
		const url = await editor.uploadAsset(asset, res.file)
		if (abortSignal.aborted) return
		editor.updateAssets([{ ...asset, props: { ...asset.props, src: url } }])
	}
}
