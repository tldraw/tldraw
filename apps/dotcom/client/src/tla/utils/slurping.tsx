import { deleteDB } from 'idb'
import {
	Editor,
	ExecutionQueue,
	LocalIndexedDb,
	TAB_ID,
	TLAsset,
	TLUiDialogsContextType,
	deleteFromLocalStorage,
	getFromLocalStorage,
	setInLocalStorage,
	sleep,
} from 'tldraw'
import { globalEditor } from '../../utils/globalEditor'
import {
	getScratchPersistenceKey,
	resetScratchPersistenceKey,
} from '../../utils/scratch-persistence-key'
import { TldrawApp } from '../app/TldrawApp'
import { SlurpFailure } from '../components/TlaEditor/SlurpFailure'

const UPLOAD_CONCURRENCY = 3
const SHOULD_SLURP_FILE = 'SHOULD_SLURP_FILE'

export function getShouldSlurpFile() {
	return getFromLocalStorage(SHOULD_SLURP_FILE)
}
export function setShouldSlurpFile() {
	setInLocalStorage(SHOULD_SLURP_FILE, 'true')
}
export function clearShouldSlurpFile() {
	deleteFromLocalStorage(SHOULD_SLURP_FILE)
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

async function retry<T>(fn: () => Promise<T>, abortSignal: AbortSignal, times = 3, timeout = 1000) {
	let error: unknown = null
	for (let i = 0; i < times; i++) {
		if (abortSignal.aborted) throw new Error('aborted')
		try {
			return await fn()
		} catch (e) {
			error = e
			await sleep(timeout)
		}
	}
	throw error
}

interface SlurperOpts {
	app: TldrawApp
	editor: Editor
	fileId: string
	abortSignal: AbortSignal
	addDialog: TLUiDialogsContextType['addDialog']
	remountImageShapes(): void
}

export async function maybeSlurp(opts: SlurperOpts) {
	if (opts.abortSignal.aborted) return
	let persistenceKey = null as string | null
	if (opts.app._slurpFileId === opts.fileId) {
		persistenceKey = getScratchPersistenceKey()
	} else {
		persistenceKey = (opts.editor.getDocumentSettings().meta.slurpPersistenceKey as string) ?? null
	}
	if (persistenceKey) {
		return new Slurper({ ...opts, slurpPersistenceKey: persistenceKey }).slurp()
	}
}

class Slurper {
	constructor(private opts: SlurperOpts & { slurpPersistenceKey: string }) {}

	async slurp() {
		if (!this.opts.editor.getDocumentSettings().meta.slurpPersistenceKey) {
			// This is a one-time operation.
			// So we need to wait a tick for react strict mode to finish
			// doing its nasty business before we start the migration.
			await sleep(50)
			if (this.opts.abortSignal.aborted) return
			await this.slurpDocumentData()
			if (this.opts.abortSignal.aborted) return
			this.opts.app._slurpFileId = null
			this.uploadLocalAssets() // no await, it can happen in the background
		} else {
			this.uploadLocalAssets() // no await, it can happen in the background
		}
	}

	// get the records out of the local indexedDb and load them into the editor
	private async slurpDocumentData() {
		const { slurpPersistenceKey, editor, abortSignal } = this.opts
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
			const meta = { ...editor.getDocumentSettings().meta, slurpPersistenceKey }
			editor.updateDocumentSettings({ meta })
			// reset the persistence key so that if the user logs out they don't
			// see the same content we already slurped
			resetScratchPersistenceKey()
		} finally {
			db.close()
		}
	}

	private showFailureDialog() {
		this.opts.addDialog({
			id: 'slurp-failure',
			component: ({ onClose }) => (
				<SlurpFailure
					slurpPersistenceKey={this.opts.slurpPersistenceKey}
					onTryAgain={() => {
						this.onTryAgain()
						onClose()
					}}
					onClose={onClose}
				/>
			),
		})
	}

	private onSlurpFail() {
		if (this.opts.abortSignal.aborted) return
		// hide failed assets
		this.opts.editor.updateAssets(
			this.opts.editor
				.getAssets()
				.map((asset) =>
					asset.props.src?.startsWith('asset:')
						? { ...asset, meta: { ...asset.meta, hidden: true } }
						: asset
				)
		)

		// need to remount all shapes to get the failure state to show for images
		this.opts.remountImageShapes()
		this.showFailureDialog()
	}

	private onTryAgain() {
		if (this.opts.abortSignal.aborted) return
		this.opts.editor.focus()
		// show failed assets
		this.opts.editor.updateAssets(
			this.opts.editor
				.getAssets()
				.map((asset) =>
					asset.props.src?.startsWith('asset:')
						? { ...asset, meta: { ...asset.meta, hidden: false } }
						: asset
				)
		)
		this.uploadLocalAssets()
	}

	private async uploadLocalAssets() {
		if (this.opts.abortSignal.aborted) return

		const assetsToUpload = this.opts.editor.store.query
			.records('asset')
			.get()
			.filter((a) => a.props.src?.startsWith('asset:'))

		const uploadQueues = new Array(UPLOAD_CONCURRENCY).fill(0).map(() => new ExecutionQueue())

		const uploads = Promise.allSettled(
			assetsToUpload.map((asset, i) =>
				uploadQueues[i % UPLOAD_CONCURRENCY].push(async () => {
					const res = await loadLocalFile(asset)
					if (!res) throw new Error(`Failed to load local file for asset ${asset.id}`)
					const url = await retry(
						() => this.opts.editor.uploadAsset(asset!, res.file, this.opts.abortSignal),
						this.opts.abortSignal
					)
					this.opts.editor.updateAssets([
						{
							...asset,
							props: { ...asset.props, src: url },
							// we might have hidden the asset if the upload failed previously
							meta: { ...asset.meta, hidden: false },
						},
					])
				})
			)
		)

		const abortPromise = new Promise<void>((resolve) => {
			this.opts.abortSignal.addEventListener('abort', () => resolve())
		})

		const res = await Promise.race([uploads, abortPromise] as const)
		if (!res || this.opts.abortSignal.aborted) {
			// aborted
			return
		}

		if (res.every((r) => r.status === 'fulfilled')) {
			// all uploads succeeded, clear the local db
			deleteDB('TLDRAW_DOCUMENT_v2' + this.opts.slurpPersistenceKey)
			const { slurpPersistenceKey: _, ...meta } = this.opts.editor.getDocumentSettings().meta
			this.opts.editor.updateDocumentSettings({ meta })
			return
		}

		for (const r of res) {
			if (r.status === 'rejected') {
				console.error('Failed to upload asset', r.reason)
			}
		}

		this.onSlurpFail()
	}
}
