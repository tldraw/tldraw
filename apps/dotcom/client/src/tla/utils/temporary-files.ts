import { Editor, LocalIndexedDb, TAB_ID, TLAsset, getFromLocalStorage, sleep } from 'tldraw'
import { SCRATCH_PERSISTENCE_KEY } from '../../utils/scratch-persistence-key'

export const TEMPORARY_FILE_KEY = 'TLA_TEMPORARY_FILE_ID_1'
export const TLA_WAS_LEGACY_CONTENT_MIGRATED = 'TLA_WAS_LEGACY_CONTENT_MIGRATED'
export const LOCAL_LEGACY_SLUG = 'local_legacy'
export const LOCAL_LEGACY_SUFFIX = '_legacy'

export async function migrateLegacyContent(editor: Editor, abortSignal: AbortSignal) {
	const db = new LocalIndexedDb(SCRATCH_PERSISTENCE_KEY)
	const data = await db.load({ sessionId: TAB_ID })
	if (abortSignal.aborted) return
	const assets = data.records.filter((r) => r.typeName === 'asset') as TLAsset[]
	// upload assets
	for (const asset of assets) {
		if (asset.props.src?.startsWith('asset:')) {
			const file = await db.getAsset(asset.id)
			if (!file) continue
			const url = await editor.uploadAsset(asset, file)
			asset.props.src = url
		}
		if (abortSignal.aborted) return
		await sleep(1000)
	}
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
