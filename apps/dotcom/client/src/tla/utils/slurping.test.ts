import { Editor, LocalIndexedDb, createShapeId, createTLStore } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TldrawApp } from '../app/TldrawApp'
import { maybeSlurp } from './slurping'

vi.mock('../components/TlaEditor/SlurpFailure', () => ({ SlurpFailure: () => null }))

vi.mock('tldraw', async (importOriginal) => {
	const actual = await importOriginal<typeof import('tldraw')>()
	return {
		...actual,
		LocalIndexedDb: class {
			async load() {
				return { records: [], schema: undefined, sessionStateSnapshot: undefined }
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

	beforeEach(() => {
		vi.useFakeTimers()
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
				canUpdateFile: () => true,
				getFile: () => ({ createSource: 'lf/local-drawing' }),
			} as unknown as TldrawApp,
			editor,
			fileId: 'file:test',
			abortSignal: new AbortController().signal,
			addDialog: vi.fn(),
			remountImageShapes: vi.fn(),
		}
	})

	afterEach(() => {
		editor?.dispose()
		vi.restoreAllMocks()
		vi.useRealTimers()
	})

	it.each(['missing schema', 'empty records'])('keeps %s retryable', async (scenario) => {
		const load = vi
			.spyOn(LocalIndexedDb.prototype, 'load')
			.mockResolvedValueOnce({
				schema: scenario === 'missing schema' ? undefined : localData.schema,
				records: [],
				sessionStateSnapshot: undefined,
			})
			.mockResolvedValueOnce(localData)

		const firstOpen = maybeSlurp(opts)
		await vi.advanceTimersByTimeAsync(50)
		await firstOpen
		expect(editor.getDocumentSettings().meta).toEqual({})
		expect(editor.getShape(shapeId)).toBeUndefined()

		const nextOpen = maybeSlurp(opts)
		await vi.advanceTimersByTimeAsync(50)
		await nextOpen
		expect(editor.getShape(shapeId)).toMatchObject({ id: shapeId, type: 'group' })
		expect(editor.getDocumentSettings().meta).toEqual({
			slurpPersistenceKey: 'local-drawing',
			slurpFinished: true,
		})
		expect(load).toHaveBeenCalledTimes(2)
	})
})
