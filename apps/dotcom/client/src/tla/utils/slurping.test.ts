import { captureMessage } from '@sentry/react'
import {
	AssetRecordType,
	Editor,
	LocalIndexedDb,
	createShapeId,
	createTLStore,
	promiseWithResolve,
} from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { globalEditor } from '../../utils/globalEditor'
import { TldrawApp } from '../app/TldrawApp'
import { maybeSlurp } from './slurping'

vi.mock('@sentry/react', () => ({ captureMessage: vi.fn() }))

vi.mock('../components/TlaEditor/SlurpFailure', () => ({ SlurpFailure: () => null }))

vi.mock('tldraw', async (importOriginal) => {
	const actual = await importOriginal<typeof import('tldraw')>()
	return {
		...actual,
		LocalIndexedDb: class {
			async load() {
				return { records: [], schema: undefined, sessionStateSnapshot: undefined }
			}
			async getAsset() {
				return new File(['image'], 'image.png', { type: 'image/png' })
			}
			close() {}
		},
	}
})

describe('maybeSlurp', () => {
	let editor: Editor
	let localData: Awaited<ReturnType<LocalIndexedDb['load']>>
	let opts: Parameters<typeof maybeSlurp>[0]
	const shapeId = createShapeId('local-drawing')
	let nextFileId = 0

	beforeEach(() => {
		vi.useFakeTimers()
		vi.stubGlobal('indexedDB', { databases: vi.fn().mockResolvedValue([]) })
		const container = document.createElement('div')
		editor = new Editor({
			store: createTLStore(),
			shapeUtils: [],
			bindingUtils: [],
			tools: [],
			getContainer: () => container,
		})
		editor.createShape({ id: shapeId, type: 'group' })
		const snapshot = editor.getSnapshot()
		localData = {
			schema: snapshot.document.schema,
			records: Object.values(snapshot.document.store),
			sessionStateSnapshot: undefined,
		}
		editor.deleteShapes([shapeId])
		opts = {
			app: {
				trackEvent: vi.fn(),
				canUpdateFile: () => true,
				getFile: () => ({ createSource: 'lf/local-drawing' }),
			} as unknown as TldrawApp,
			editor,
			fileId: `file:test-${nextFileId++}`,
			abortSignal: new AbortController().signal,
			addDialog: vi.fn(),
			remountImageShapes: vi.fn(),
		}
	})

	afterEach(() => {
		globalEditor.set(null)
		editor?.dispose()
		vi.restoreAllMocks()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.useRealTimers()
	})

	async function slurp() {
		const result = maybeSlurp(opts)
		await vi.advanceTimersByTimeAsync(50)
		await result
	}

	function expectSkipped(reason: string, local_db_exists: boolean | null) {
		expect(opts.app.trackEvent).toHaveBeenCalledExactlyOnceWith('slurp_skipped', {
			source: 'app',
			reason,
			local_db_exists,
		})
	}

	it.each(['missing schema', 'empty records'])('keeps %s retryable', async (scenario) => {
		const load = vi
			.spyOn(LocalIndexedDb.prototype, 'load')
			.mockResolvedValueOnce({
				schema: scenario === 'missing schema' ? undefined : localData.schema,
				records: [],
				sessionStateSnapshot: undefined,
			})
			.mockResolvedValueOnce(localData)

		await slurp()
		expect(editor.getDocumentSettings().meta).toEqual({})
		expect(editor.getShape(shapeId)).toBeUndefined()

		await slurp()
		expect(editor.getShape(shapeId)).toMatchObject({ id: shapeId, type: 'group' })
		expect(editor.getDocumentSettings().meta).toEqual({
			slurpPersistenceKey: 'local-drawing',
			slurpFinished: true,
		})
		expect(load).toHaveBeenCalledTimes(2)
	})
	async function restore() {
		vi.spyOn(LocalIndexedDb.prototype, 'load').mockResolvedValue(localData)
		await slurp()
	}

	it('reports restored record counts', async () => {
		await restore()
		expect(opts.app.trackEvent).toHaveBeenCalledWith('slurp_restored', {
			source: 'app',
			record_count: localData.records.length,
			shape_count: 1,
			note_count: 0,
			asset_count: 0,
		})
	})

	it.each([true, false, 'unsupported', 'failed'] as const)(
		'reports no local data with database existence %s',
		async (exists) => {
			if (exists === 'unsupported') vi.stubGlobal('indexedDB', {})
			else if (exists === 'failed')
				vi.mocked(indexedDB.databases).mockRejectedValue(new Error('unavailable'))
			else
				vi.mocked(indexedDB.databases).mockResolvedValue(
					exists ? [{ name: 'TLDRAW_DOCUMENT_v2local-drawing' }] : []
				)
			await slurp()
			expectSkipped('no_local_data', typeof exists === 'boolean' ? exists : null)
			expect(captureMessage).toHaveBeenCalledTimes(exists === true ? 1 : 0)
			expect(opts.addDialog).not.toHaveBeenCalled()
		}
	)

	it('reports remotely removed restored records once after the observation window', async () => {
		await restore()
		editor.store.mergeRemoteChanges(() => editor.deleteShapes([shapeId]))
		await vi.advanceTimersByTimeAsync(10000)
		expect(opts.app.trackEvent).toHaveBeenCalledWith('slurp_restore_removed', {
			source: 'app',
			record_count: 1,
			shape_count: 1,
			note_count: 0,
			asset_count: 0,
		})
		expect(captureMessage).toHaveBeenCalledTimes(1)
		await vi.advanceTimersByTimeAsync(10000)
		expect(captureMessage).toHaveBeenCalledTimes(1)
	})

	it.each(['local', 'readded', 'aborted', 'disposed', 'unrelated'])(
		'ignores %s removals and cleans up observation',
		async (scenario) => {
			const controller = new AbortController()
			opts.abortSignal = controller.signal
			const listen = editor.store.listen.bind(editor.store)
			const stop = vi.fn()
			vi.spyOn(editor.store, 'listen').mockImplementation((listener, filters) => {
				const unlisten = listen(listener, filters)
				return () => {
					stop()
					unlisten()
				}
			})
			await restore()
			const shape = editor.getShape(shapeId)!
			if (scenario === 'local') editor.deleteShapes([shapeId])
			else if (scenario === 'unrelated') {
				const id = createShapeId('unrelated')
				editor.createShape({ id, type: 'group' })
				editor.store.mergeRemoteChanges(() => editor.deleteShapes([id]))
			} else editor.store.mergeRemoteChanges(() => editor.deleteShapes([shapeId]))
			if (scenario === 'readded') editor.store.mergeRemoteChanges(() => editor.store.put([shape]))
			if (scenario === 'aborted') controller.abort()
			if (scenario === 'disposed') editor.dispose()
			await vi.advanceTimersByTimeAsync(10000)
			expect(stop).toHaveBeenCalledTimes(1)
			expect(captureMessage).not.toHaveBeenCalled()
			expect(
				vi
					.mocked(opts.app.trackEvent)
					.mock.calls.filter(([name]) => name === 'slurp_restore_removed')
			).toEqual([])
		}
	)

	it('deduplicates existing empty database warnings per file', async () => {
		vi.mocked(indexedDB.databases).mockResolvedValue([{ name: 'TLDRAW_DOCUMENT_v2local-drawing' }])
		for (let i = 0; i < 2; i++) {
			await slurp()
		}
		expect(captureMessage).toHaveBeenCalledExactlyOnceWith(
			'Slurp found incomplete local data in an existing database',
			{ level: 'warning', extra: { fileId: opts.fileId, reason: 'no_local_data' } }
		)
	})

	it.each(['read_error', 'restore_error'])(
		'reports %s without swallowing the error',
		async (reason) => {
			const error = new Error('failed')
			vi.spyOn(LocalIndexedDb.prototype, 'load').mockResolvedValue(localData)
			if (reason === 'read_error')
				vi.spyOn(LocalIndexedDb.prototype, 'load').mockRejectedValue(error)
			else
				vi.spyOn(editor, 'loadSnapshot').mockImplementation(() => {
					throw error
				})
			const result = expect(maybeSlurp(opts)).rejects.toBe(error)
			await vi.advanceTimersByTimeAsync(50)
			await result
			expectSkipped(reason, false)
		}
	)

	it.each(['success', 'failure', 'aborted'])(
		'reports asset upload %s with bounded counts',
		async (outcome) => {
			globalEditor.set(editor)
			const assetId = AssetRecordType.createId('local-image')
			editor.createAssets([
				{
					id: assetId,
					typeName: 'asset',
					type: 'image',
					meta: {},
					props: {
						w: 100,
						h: 100,
						name: 'image.png',
						isAnimated: false,
						mimeType: 'image/png',
						src: 'asset:local-image',
					},
				},
			])
			editor.createShape({ id: shapeId, type: 'group' })
			editor.updateDocumentSettings({ meta: { slurpPersistenceKey: 'local-drawing' } })
			vi.stubGlobal(
				'URL',
				class extends URL {
					static createObjectURL() {
						return 'blob:local-image'
					}
				}
			)
			const upload = vi.spyOn(editor, 'uploadAsset')
			const controller = new AbortController()
			opts.abortSignal = controller.signal
			if (outcome === 'success') upload.mockResolvedValue({ src: 'https://assets.test/image.png' })
			if (outcome === 'failure') {
				upload.mockRejectedValue(new Error('upload failed'))
				vi.spyOn(console, 'error').mockImplementation(() => {})
			}
			if (outcome === 'aborted') upload.mockImplementation(() => new Promise(() => {}))
			await maybeSlurp(opts)
			await vi.advanceTimersByTimeAsync(0)
			if (outcome === 'aborted') controller.abort()
			await vi.advanceTimersByTimeAsync(5000)
			expect(opts.app.trackEvent).toHaveBeenCalledExactlyOnceWith('slurp_finished', {
				source: 'app',
				completion: 'client_asset_work',
				outcome,
				asset_count: 1,
				uploaded_count: outcome === 'success' ? 1 : 0,
				failed_count: outcome === 'failure' ? 1 : 0,
			})
			expect(editor.getDocumentSettings().meta.slurpFinished).toBe(
				outcome === 'success' ? true : undefined
			)
			expect(opts.addDialog).toHaveBeenCalledTimes(outcome === 'failure' ? 1 : 0)
		}
	)

	it('restores and completes asset work even if analytics throws', async () => {
		vi.mocked(opts.app.trackEvent).mockImplementation(() => {
			throw new Error('analytics failed')
		})
		await restore()
		expect(editor.getShape(shapeId)).toBeDefined()
		expect(editor.getDocumentSettings().meta.slurpFinished).toBe(true)
	})

	it('restores and completes asset work after the normal delay with unresolved inventory', async () => {
		vi.mocked(indexedDB.databases).mockImplementation(() => new Promise(() => {}))
		vi.spyOn(LocalIndexedDb.prototype, 'load').mockResolvedValue(localData)
		const result = maybeSlurp(opts)
		await vi.advanceTimersByTimeAsync(50)
		expect(editor.getShape(shapeId)).toBeDefined()
		expect(editor.getDocumentSettings().meta.slurpFinished).toBe(true)
		await result
	})

	it('ignores inventory that resolves after the local database was opened', async () => {
		const inventory = promiseWithResolve<IDBDatabaseInfo[]>()
		const data = promiseWithResolve<typeof localData>()
		vi.mocked(indexedDB.databases).mockReturnValue(inventory)
		const load = vi.spyOn(LocalIndexedDb.prototype, 'load').mockReturnValue(data)
		const result = maybeSlurp(opts)
		await vi.advanceTimersByTimeAsync(50)
		expect(load).toHaveBeenCalledTimes(1)
		inventory.resolve([{ name: 'TLDRAW_DOCUMENT_v2local-drawing' }])
		await vi.advanceTimersByTimeAsync(0)
		data.resolve({ records: [], schema: undefined, sessionStateSnapshot: undefined })
		await result
		expectSkipped('no_local_data', null)
		expect(captureMessage).not.toHaveBeenCalled()
	})
	it.each(['analytics', 'Sentry'])(
		'keeps incomplete data retryable if %s throws',
		async (service) => {
			vi.mocked(indexedDB.databases).mockResolvedValue([
				{ name: 'TLDRAW_DOCUMENT_v2local-drawing' },
			])
			const report = service === 'analytics' ? opts.app.trackEvent : captureMessage
			vi.mocked(report).mockImplementationOnce(() => {
				throw new Error('telemetry failed')
			})
			await slurp()
			expect(captureMessage).toHaveBeenCalledTimes(1)
			await restore()
			expect(editor.getShape(shapeId)).toBeDefined()
			expect(editor.getDocumentSettings().meta.slurpFinished).toBe(true)
		}
	)

	it('reports abort during a local read without diagnosing missing data', async () => {
		const data = promiseWithResolve<typeof localData>()
		vi.spyOn(LocalIndexedDb.prototype, 'load').mockReturnValue(data)
		const controller = new AbortController()
		opts.abortSignal = controller.signal
		const result = maybeSlurp(opts)
		await vi.advanceTimersByTimeAsync(50)
		controller.abort()
		data.resolve(localData)
		await result
		expectSkipped('aborted', false)
		expect(editor.getShape(shapeId)).toBeUndefined()
		expect(captureMessage).not.toHaveBeenCalled()
	})
})
