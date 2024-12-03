import { deleteDB } from 'idb'
import { Editor, LocalIndexedDb, TAB_ID, TLAsset } from 'tldraw'
import { globalEditor } from '../../utils/globalEditor'
import {
	getScratchPersistenceKey,
	resetScratchPersistenceKey,
} from '../../utils/scratch-persistence-key'

export const SHOULD_SLURP_FILE = 'SHOULD_SLURP_FILE'
export const LOCAL_LEGACY_SLUG = 'local_legacy'
export const LOCAL_LEGACY_SUFFIX = '_legacy'

export async function slurpLocalContent(editor: Editor, abortSignal: AbortSignal) {
	const slurpPersistenceKey = getScratchPersistenceKey()
	const db = new LocalIndexedDb(slurpPersistenceKey)
	try {
		const data = await db.load({ sessionId: TAB_ID })
		if (data.records.length < 3) return // no meaningful content to slurp
		if (abortSignal.aborted) return
		// Assets will be served from the local indexedDb while they are being uploaded
		editor.loadSnapshot({
			document: {
				schema: data.schema,
				store: Object.fromEntries(data.records.map((r) => [r.id, r])),
			},
			session: data.sessionStateSnapshot,
		})
		editor.updateDocumentSettings({ meta: { slurpPersistenceKey } })
		// reset the persistence key so that if the user logs out they don't
		// see the same content we already slurped
		resetScratchPersistenceKey()
	} finally {
		db.close()
	}
}

const localFileCache = new WeakMap<TLAsset, { file: File; url: string }>()

function getSlurpPersistenceKey() {
	const editor = globalEditor.get()
	if (!editor) return null
	const key = editor.getDocumentSettings().meta.slurpPersistenceKey
	if (!key) return null
	return key as string
}

export async function loadLocalFile(asset: TLAsset): Promise<{ file: File; url: string } | null> {
	const existing = localFileCache.get(asset)
	if (existing) return existing
	const slurpPersistenceKey = getSlurpPersistenceKey()
	if (!slurpPersistenceKey) return null

	const db = new LocalIndexedDb(slurpPersistenceKey)
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

	// all done, kill the old db
	const key = 'TLDRAW_DOCUMENT_v2' + editor.getDocumentSettings().meta.slurpPersistenceKey
	deleteDB(key)
}
