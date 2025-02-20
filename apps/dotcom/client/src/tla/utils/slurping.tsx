// import { deleteDB } from 'idb'
import {
	Editor,
	ExecutionQueue,
	LocalIndexedDb,
	TAB_ID,
	TLAsset,
	TLUiDialogsContextType,
	deleteFromLocalStorage,
	getFromLocalStorage,
	retry,
	setInLocalStorage,
	sleep,
} from 'tldraw'
import { globalEditor } from '../../utils/globalEditor'
import { resetScratchPersistenceKey } from '../../utils/scratch-persistence-key'
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

// asset stores are not given access to the editor or even the Store instance so
// in order to allow the multiplayerAssetStore to load assets from indexedDb we need
// to piggyback on the global editor instance.
// TODO: maybe think about giving the asset store access to the editor instance directly?
function getGlobalSlurpPersistenceKey() {
	return (globalEditor.get()?.getDocumentSettings().meta.slurpPersistenceKey as string) ?? null
}

const localFileCache = new WeakMap<TLAsset, { file: File; url: string }>()
// this is used by our multiplayer asset store to load slurped assets from indexedDb
// temporarily while they are being uploaded to the server.
export async function loadLocalFile(asset: TLAsset): Promise<{ file: File; url: string } | null> {
	const existing = localFileCache.get(asset)
	if (existing) return existing
	const slurpPersistenceKey = getGlobalSlurpPersistenceKey()
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
	if (!opts.app.isFileOwner(opts.fileId)) return
	const file = opts.app.getFile(opts.fileId)
	const persistenceKey =
		(opts.editor.getDocumentSettings().meta.slurpPersistenceKey as string | undefined) ||
		file?.createSource?.match(/lf\/(.+)/)?.[1]
	if (!persistenceKey) return
	if (opts.editor.getDocumentSettings().meta.slurpFinished) return
	return new Slurper({ ...opts, slurpPersistenceKey: persistenceKey }).slurp()
}

export class Slurper {
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
		}
		this.uploadLocalAssets() // no await, it can happen in the background
	}

	// get the records out of the local indexedDb and load them into the editor
	private async slurpDocumentData() {
		const { slurpPersistenceKey, editor, abortSignal } = this.opts
		const db = new LocalIndexedDb(slurpPersistenceKey)
		try {
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
		this.opts.remountImageShapes()
		this.slurp()
	}

	private async uploadLocalAssets() {
		if (this.opts.abortSignal.aborted) return

		const assetsToUpload = this.opts.editor.store.query
			.records('asset')
			.get()
			.filter((a) => a.props.src?.startsWith('asset:'))

		// we create a small set of execution queues to upload assets concurrently
		// and to allow some to succeed and some to fail regardless of order
		const uploadQueues = new Array(UPLOAD_CONCURRENCY).fill(0).map(() => new ExecutionQueue())

		const uploads = Promise.allSettled(
			assetsToUpload.map((asset, i) =>
				uploadQueues[i % UPLOAD_CONCURRENCY].push(async () => {
					const res = await loadLocalFile(asset)
					if (!res) throw new Error(`Failed to load local file for asset ${asset.id}`)
					const { src } = await retry(
						() => this.opts.editor.uploadAsset(asset!, res.file, this.opts.abortSignal),
						{
							attempts: 3,
							waitDuration: 1000,
							abortSignal: this.opts.abortSignal,
						}
					)
					this.opts.editor.updateAssets([
						{
							...asset,
							props: { ...asset.props, src },
							// we might have hidden the asset if the upload failed previously
							meta: { ...asset.meta, hidden: false, fileId: this.opts.fileId },
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
			// .every returns true if the array is empty, so this will run if there
			// were no assets to upload!

			// all uploads succeeded, clear the local db
			// (temporarily do not delete the db in case something goes wrong and people lose their stuffs)
			// deleteDB('TLDRAW_DOCUMENT_v2' + this.opts.slurpPersistenceKey)
			this.opts.editor.updateDocumentSettings({
				meta: {
					...this.opts.editor.getDocumentSettings().meta,
					slurpFinished: true,
				},
			})
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
