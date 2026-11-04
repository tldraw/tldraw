// import { deleteDB } from 'idb'
import { captureMessage } from '@sentry/react'
import {
	Editor,
	ExecutionQueue,
	LocalIndexedDb,
	TAB_ID,
	TLAsset,
	TLRecord,
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
import { TLAppUiEventMap } from './app-ui-events'

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

const warnedSlurpFiles = new Set<string>()

function warnSlurp(
	fileId: string,
	reason: 'no_local_data' | 'restore_removed',
	counts?: TLAppUiEventMap['slurp_restore_removed']
) {
	const key = `${fileId}:${reason}`
	if (warnedSlurpFiles.has(key)) return
	warnedSlurpFiles.add(key)
	reportTelemetry(() =>
		captureMessage(
			reason === 'no_local_data'
				? 'Slurp found incomplete local data in an existing database'
				: 'Slurp restored records remained absent after remote removal',
			{
				level: 'warning',
				extra: { fileId, reason, ...counts },
			}
		)
	)
}

function reportTelemetry(report: () => void) {
	try {
		report()
	} catch {
		// Diagnostics must not interrupt restoration or client asset work.
	}
}

function probeLocalDatabase(persistenceKey: string, opts: SlurperOpts): () => boolean | null {
	if (!window.indexedDB?.databases) return () => null
	const { editor, abortSignal } = opts
	let exists: boolean | null = null
	let finished = false
	const finish = (value: boolean | null) => {
		if (finished) return
		finished = true
		exists = value
		editor.timers.clearTimeout(timer)
		abortSignal.removeEventListener('abort', onAbort)
		editor.disposables.delete(onAbort)
	}
	const onAbort = () => finish(null)
	const timer = editor.timers.setTimeout(onAbort, 1000)
	abortSignal.addEventListener('abort', onAbort, { once: true })
	editor.disposables.add(onAbort)
	try {
		window.indexedDB.databases().then(
			(databases) =>
				finish(databases.some((db) => db.name === 'TLDRAW_DOCUMENT_v2' + persistenceKey)),
			() => finish(null)
		)
	} catch {
		finish(null)
	}
	return () => {
		// Opening LocalIndexedDb creates it, so later inventory cannot establish prior existence.
		finish(exists)
		return exists
	}
}

function countRecords(records: TLRecord[]): TLAppUiEventMap['slurp_restored'] {
	const counts = { record_count: records.length, shape_count: 0, note_count: 0, asset_count: 0 }
	for (const record of records) {
		if (record.typeName === 'shape') {
			counts.shape_count++
			if (record.type === 'note') counts.note_count++
		} else if (record.typeName === 'asset') {
			counts.asset_count++
		}
	}
	return counts
}

export async function maybeSlurp(opts: SlurperOpts) {
	const file = opts.app.getFile(opts.fileId)
	const persistenceKey =
		(opts.editor.getDocumentSettings().meta.slurpPersistenceKey as string | undefined) ||
		file?.createSource?.match(/lf\/(.+)/)?.[1]
	if (!persistenceKey) return
	const earlySkip = opts.abortSignal.aborted
		? 'aborted'
		: !opts.app.canUpdateFile(opts.fileId)
			? 'permission'
			: opts.editor.getDocumentSettings().meta.slurpFinished
				? 'already_finished'
				: null
	if (earlySkip) {
		reportTelemetry(() =>
			opts.app.trackEvent('slurp_skipped', {
				source: 'app',
				reason: earlySkip,
				local_db_exists: null,
			})
		)
		return
	}
	return new Slurper(
		{ ...opts, slurpPersistenceKey: persistenceKey },
		probeLocalDatabase(persistenceKey, opts)
	).slurp()
}

export class Slurper {
	constructor(
		private opts: SlurperOpts & { slurpPersistenceKey: string },
		private captureLocalDbExists: () => boolean | null = () => null
	) {}

	private localDbExists: boolean | null = null

	private skip(reason: TLAppUiEventMap['slurp_skipped']['reason']) {
		reportTelemetry(() =>
			this.opts.app.trackEvent('slurp_skipped', {
				source: 'app',
				reason,
				local_db_exists: this.localDbExists,
			})
		)
	}

	private observeRestoredRecords(records: TLRecord[]) {
		const { editor, abortSignal, app, fileId } = this.opts
		const restored = new Map(records.map((record) => [record.id, record]))
		const removed = new Set<TLRecord['id']>()
		const unlisten = editor.store.listen(
			({ changes }) => {
				for (const id of Object.keys(changes.removed) as TLRecord['id'][]) {
					if (restored.has(id)) removed.add(id)
				}
			},
			{ source: 'remote', scope: 'document' }
		)
		const cleanup = () => {
			unlisten()
			editor.timers.clearTimeout(timer)
			abortSignal.removeEventListener('abort', cleanup)
			editor.disposables.delete(cleanup)
		}
		const timer = editor.timers.setTimeout(() => {
			cleanup()
			if (abortSignal.aborted) return
			const absent = [...removed]
				.filter((id) => !editor.store.has(id))
				.map((id) => restored.get(id)!)
			if (!absent.length) return
			const counts = countRecords(absent)
			reportTelemetry(() => app.trackEvent('slurp_restore_removed', { source: 'app', ...counts }))
			warnSlurp(fileId, 'restore_removed', counts)
			// Restored shapes the server dropped are the one failure this browser can prove: the local
			// copy is still here, so point at it instead of leaving an empty board.
			if (counts.shape_count > 0) this.showFailureDialog()
		}, 10000)
		abortSignal.addEventListener('abort', cleanup, { once: true })
		editor.disposables.add(cleanup)
	}

	async slurp() {
		if (
			this.opts.editor.getDocumentSettings().meta.slurpPersistenceKey !==
			this.opts.slurpPersistenceKey
		) {
			// This is a one-time operation.
			// So we need to wait a tick for react strict mode to finish
			// doing its nasty business before we start the migration.
			await sleep(50)
			if (this.opts.abortSignal.aborted) {
				this.skip('aborted')
				return
			}
			const didRestoreDocument = await this.slurpDocumentData()
			if (!didRestoreDocument) return
			if (this.opts.abortSignal.aborted) return
		}
		this.captureLocalDbExists()
		this.uploadLocalAssets() // no await, it can happen in the background
	}

	// get the records out of the local indexedDb and load them into the editor
	private async slurpDocumentData(): Promise<boolean> {
		const { slurpPersistenceKey, editor, abortSignal } = this.opts
		this.localDbExists = this.captureLocalDbExists()
		const db = new LocalIndexedDb(slurpPersistenceKey)
		let stage: 'read_error' | 'restore_error' = 'read_error'
		try {
			const data = await db.load({ sessionId: TAB_ID })
			if (abortSignal.aborted) {
				this.skip('aborted')
				return false
			}
			// Another restore may have completed while this one was reading IndexedDB.
			if (editor.getDocumentSettings().meta.slurpPersistenceKey === slurpPersistenceKey) return true
			// Other devices and workspace members won't have this browser's local data.
			if (!data.schema || data.records.length === 0) {
				this.skip('no_local_data')
				if (this.localDbExists === true) warnSlurp(this.opts.fileId, 'no_local_data')
				return false
			}
			// Recover existing cloud edits alongside local content manually so neither is overwritten.
			if (editor.store.query.records('shape').get().length > 0) {
				this.showFailureDialog()
				return false
			}
			// Assets will be served from the local indexedDb while they are being uploaded
			stage = 'restore_error'
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
			const restoredRecords = data.records
				.map((record) => editor.store.get(record.id))
				.filter((record): record is TLRecord => !!record)
			reportTelemetry(() =>
				this.opts.app.trackEvent('slurp_restored', {
					source: 'app',
					...countRecords(restoredRecords),
				})
			)
			this.observeRestoredRecords(restoredRecords)
			return true
		} catch (error) {
			this.skip(abortSignal.aborted ? 'aborted' : stage)
			throw error
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

	// Assets still pointing at the local db are the ones whose upload didn't finish. Image shapes
	// need a remount for the failure state to show.
	private setUnuploadedAssetsHidden(hidden: boolean) {
		this.opts.editor.updateAssets(
			this.opts.editor
				.getAssets()
				.map((asset) =>
					asset.props.src?.startsWith('asset:')
						? { ...asset, meta: { ...asset.meta, hidden } }
						: asset
				)
		)
		this.opts.remountImageShapes()
	}

	private onSlurpFail() {
		if (this.opts.abortSignal.aborted) return
		this.setUnuploadedAssetsHidden(true)
		this.showFailureDialog()
	}

	private onTryAgain() {
		if (this.opts.abortSignal.aborted) return
		this.setUnuploadedAssetsHidden(false)
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

		let uploadedCount = 0
		let failedCount = 0
		const reportFinished = (outcome: TLAppUiEventMap['slurp_finished']['outcome']) =>
			reportTelemetry(() =>
				this.opts.app.trackEvent('slurp_finished', {
					source: 'app',
					completion: 'client_asset_work',
					outcome,
					asset_count: assetsToUpload.length,
					uploaded_count: uploadedCount,
					failed_count: failedCount,
				})
			)
		const uploads = Promise.allSettled(
			assetsToUpload.map((asset, i) =>
				uploadQueues[i % UPLOAD_CONCURRENCY]
					.push(async () => {
						const res = await loadLocalFile(asset)
						if (!res) throw new Error(`Failed to load local file for asset ${asset.id}`)
						const { src } = await retry(
							() => this.opts.editor.uploadAsset(asset, res.file, this.opts.abortSignal),
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
					.then(
						() => {
							uploadedCount++
						},
						(error) => {
							failedCount++
							throw error
						}
					)
			)
		)

		let onAbort: () => void
		const abortPromise = new Promise<void>((resolve) => {
			onAbort = resolve
			this.opts.abortSignal.addEventListener('abort', onAbort, { once: true })
		})

		const res = await Promise.race([uploads, abortPromise] as const)
		this.opts.abortSignal.removeEventListener('abort', onAbort!)
		if (!res || this.opts.abortSignal.aborted) {
			// aborted
			reportFinished('aborted')
			return
		}

		reportFinished(res.every((r) => r.status === 'fulfilled') ? 'success' : 'failure')
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
