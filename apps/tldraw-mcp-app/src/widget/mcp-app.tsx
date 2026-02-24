import { type App, useApp } from '@modelcontextprotocol/ext-apps/react'
import { useCallback, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { type TLShape, Editor, Tldraw, getIndexAbove, structuredClone } from 'tldraw'
import 'tldraw/tldraw.css'
import {
	type FocusedShape,
	type FocusedShapeUpdate,
	FocusedShapeSchema,
	FocusedShapeUpdateSchema,
	convertFocusedShapeToTldrawRecord,
	convertTldrawRecordToFocusedShape,
} from '../focused-shape'
import { healJsonArrayString } from '../parse-json'

const EDITOR_HEIGHT = 600
const CONTEXT_DEBOUNCE_MS = 500

interface CanvasSnapshot {
	shapes: TLShape[]
}

interface CreateMutation {
	action: 'create'
	newBlankCanvas: boolean
	focusedShapes: FocusedShape[]
	tldrawRecords: TLShape[]
}

interface UpdateMutation {
	action: 'update'
	updates: FocusedShapeUpdate[]
}

interface DeleteMutation {
	action: 'delete'
	shapeIds: string[]
}

type Mutation = CreateMutation | UpdateMutation | DeleteMutation

const debugLines: string[] = []
function log(msg: string) {
	debugLines.push(`${new Date().toISOString().slice(11, 23)} ${msg}`)
	const el = document.getElementById('debug')
	if (el) el.textContent = debugLines.join('\n')
}

window.addEventListener('error', (e) => log(`ERROR: ${e.message}`))
window.addEventListener('unhandledrejection', (e) => log(`REJECTION: ${e.reason}`))

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function normalizeShapeId(shapeId: string): string {
	return shapeId.startsWith('shape:') ? shapeId : `shape:${shapeId}`
}

function toSimpleShapeId(shapeId: string): string {
	return shapeId.replace(/^shape:/, '')
}

function deepMerge(base: unknown, patch: unknown): unknown {
	if (!isRecord(base) || !isRecord(patch)) return patch

	const merged: Record<string, unknown> = { ...base }
	for (const [key, value] of Object.entries(patch)) {
		merged[key] = deepMerge(merged[key], value)
	}
	return merged
}

// --- Mutation parsing ---

function parseMutationFromToolResult(result: unknown): Mutation | null {
	if (!isRecord(result)) return null
	const sc = result.structuredContent
	if (!isRecord(sc)) return null
	if (typeof sc.action !== 'string') return null

	switch (sc.action) {
		case 'create':
			return {
				action: 'create',
				newBlankCanvas: sc.newBlankCanvas === true,
				focusedShapes: Array.isArray(sc.focusedShapes) ? sc.focusedShapes : [],
				tldrawRecords: Array.isArray(sc.tldrawRecords) ? sc.tldrawRecords : [],
			} as CreateMutation
		case 'update':
			return {
				action: 'update',
				updates: Array.isArray(sc.updates) ? sc.updates : [],
			} as UpdateMutation
		case 'delete':
			return {
				action: 'delete',
				shapeIds: Array.isArray(sc.shapeIds) ? sc.shapeIds : [],
			} as DeleteMutation
		default:
			return null
	}
}

// --- Mutation application ---

function applyMutation(editor: Editor, mutation: Mutation) {
	switch (mutation.action) {
		case 'create': {
			const records = mutation.tldrawRecords.map((r) => structuredClone(r))
			editor.store.mergeRemoteChanges(() => {
				editor.run(
					() => {
						if (mutation.newBlankCanvas) {
							const existingIds = [...editor.getCurrentPageShapeIds()]
							if (existingIds.length > 0) {
								editor.deleteShapes(existingIds)
							}
						}
						if (records.length <= 0) return

						const pageId = editor.getCurrentPageId()
						const existingIds = new Set([...editor.getCurrentPageShapeIds()])
						const nextIndexByParent = new Map<
							string,
							ReturnType<Editor['getHighestIndexForParent']>
						>()

						const toCreate: TLShape[] = []
						const toUpdate: TLShape[] = []

						for (const shape of records) {
							const parentId =
								typeof shape.parentId === 'string' && shape.parentId.length > 0
									? shape.parentId
									: pageId
							shape.parentId = parentId

							if (existingIds.has(shape.id)) {
								toUpdate.push(shape)
							} else {
								if (!nextIndexByParent.has(parentId)) {
									nextIndexByParent.set(parentId, editor.getHighestIndexForParent(parentId))
								}
								const nextIndex = nextIndexByParent.get(parentId)!
								shape.index = nextIndex
								nextIndexByParent.set(parentId, getIndexAbove(nextIndex))
								toCreate.push(shape)
							}
						}

						if (toUpdate.length > 0) editor.updateShapes(toUpdate)
						if (toCreate.length > 0) editor.createShapes(toCreate)
					},
					{ history: 'ignore' }
				)
			})
			break
		}
		case 'update': {
			editor.store.mergeRemoteChanges(() => {
				editor.run(
					() => {
						const toUpdate: TLShape[] = []

						for (const update of mutation.updates) {
							const id = normalizeShapeId(update.shapeId)
							const existing = editor.getShape(id as TLShape['id'])
							if (!existing) continue

							try {
								const existingFocused = convertTldrawRecordToFocusedShape(existing)
								const merged = deepMerge(existingFocused, {
									...update,
									shapeId: toSimpleShapeId(id),
									_type: update._type ?? existingFocused._type,
								}) as FocusedShape
								const converted = convertFocusedShapeToTldrawRecord(merged)
								converted.index = existing.index
								toUpdate.push(converted)
							} catch {
								// Skip invalid update inputs.
							}
						}

						if (toUpdate.length > 0) editor.updateShapes(toUpdate)
					},
					{ history: 'ignore' }
				)
			})
			break
		}
		case 'delete': {
			const idsToDelete = mutation.shapeIds
				.map((id) => normalizeShapeId(id) as TLShape['id'])
				.filter((id) => editor.getShape(id) != null)
			if (idsToDelete.length > 0) {
				editor.store.mergeRemoteChanges(() => {
					editor.run(
						() => {
							editor.deleteShapes(idsToDelete)
						},
						{ history: 'ignore' }
					)
				})
			}
			break
		}
	}
}

// --- Canvas context + server cache push ---

function getEditorFocusedShapes(editor: Editor): FocusedShape[] {
	const shapes: FocusedShape[] = []
	for (const record of editor.getCurrentPageShapes()) {
		try {
			shapes.push(convertTldrawRecordToFocusedShape(record))
		} catch {
			// Ignore malformed records.
		}
	}
	return shapes
}

function pushCanvasContext(app: App, editor: Editor) {
	const focusedShapes = getEditorFocusedShapes(editor)
	const text =
		focusedShapes.length > 0
			? `Current canvas shapes:\n${JSON.stringify(focusedShapes, null, 2)}`
			: 'Canvas is empty.'
	app.updateModelContext({ content: [{ type: 'text', text }] })
}

function pushCanvasStateToServer(app: App, editor: Editor) {
	const shapes = [...editor.getCurrentPageShapes()].map((s) => structuredClone(s))
	app
		.callServerTool({
			name: 'push_canvas_state',
			arguments: { shapesJson: JSON.stringify(shapes) },
		})
		.catch(() => {
			// Best-effort push; failure is non-fatal.
		})
}

function toSnapshotShapesFromRecords(value: unknown): TLShape[] | null {
	if (!Array.isArray(value)) return null
	return value.filter((shape): shape is TLShape => {
		return isRecord(shape) && typeof shape.id === 'string' && typeof shape.type === 'string'
	})
}

async function fetchInitialShapes(app: App): Promise<TLShape[]> {
	try {
		const result = await app.callServerTool({
			name: 'get_canvas_state',
			arguments: {},
		})
		if (!isRecord(result)) return []
		const sc = result.structuredContent
		if (!isRecord(sc)) return []
		return toSnapshotShapesFromRecords(sc.shapes) ?? []
	} catch {
		return []
	}
}

// --- Streaming preview helpers ---

function parsePartialJsonArray(value: string): unknown[] {
	const trimmed = healJsonArrayString(value.trim())
	if (!trimmed.startsWith('[')) return []

	const candidates: string[] = [trimmed]
	if (!trimmed.endsWith(']')) {
		candidates.push(`${trimmed}]`)
	}

	const withoutTrailingBracket = trimmed.endsWith(']') ? trimmed.slice(0, -1) : trimmed
	const lastComma = withoutTrailingBracket.lastIndexOf(',')
	if (lastComma > 0) {
		candidates.push(`${withoutTrailingBracket.slice(0, lastComma)}]`)
	}

	const lastObjectEnd = withoutTrailingBracket.lastIndexOf('}')
	if (lastObjectEnd >= 0) {
		candidates.push(`${withoutTrailingBracket.slice(0, lastObjectEnd + 1)}]`)
	}

	for (const candidate of new Set(candidates)) {
		try {
			const parsed = JSON.parse(candidate)
			if (Array.isArray(parsed)) return parsed
		} catch {
			// Keep trying best-effort candidates.
		}
	}

	return []
}

function dropPotentiallyIncompleteTail<T>(items: T[]): T[] {
	if (items.length <= 1) return []
	return items.slice(0, -1)
}

function extractToolArguments(input: unknown): Record<string, unknown> | null {
	if (!isRecord(input)) return null
	const args = input.arguments
	return isRecord(args) ? args : input
}

function parsePreviewArray(value: unknown, isPartial: boolean): unknown[] {
	let parsedItems: unknown[] = []
	if (Array.isArray(value)) {
		parsedItems = value
	} else if (typeof value === 'string') {
		parsedItems = parsePartialJsonArray(value)
	} else {
		return []
	}

	return isPartial ? dropPotentiallyIncompleteTail(parsedItems) : parsedItems
}

function parseNewBlankCanvasFlag(value: unknown, isPartial: boolean): boolean | null {
	if (typeof value === 'boolean') return value
	if (typeof value === 'number') return value !== 0
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase()
		if (normalized.length === 0) return null
		if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true
		if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false
		if (isPartial) {
			if ('true'.startsWith(normalized)) return true
			if ('false'.startsWith(normalized)) return false
		}
	}
	return null
}

function toCreatePreviewShapes(value: unknown, isPartial: boolean): TLShape[] {
	const candidateItems = parsePreviewArray(value, isPartial)
	const previewShapes: TLShape[] = []
	for (const item of candidateItems) {
		const parsed = FocusedShapeSchema.safeParse(item)
		if (!parsed.success) continue
		try {
			previewShapes.push(convertFocusedShapeToTldrawRecord(parsed.data))
		} catch {
			// Ignore unsupported preview items.
		}
	}
	return previewShapes
}

function toUpdatePreviewShapes(
	value: unknown,
	isPartial: boolean,
	baseShapes: TLShape[]
): TLShape[] {
	const candidateItems = parsePreviewArray(value, isPartial)
	if (candidateItems.length <= 0) return []

	const baseShapesById = new Map<string, TLShape>()
	for (const shape of baseShapes) {
		baseShapesById.set(shape.id, shape)
	}

	const previewShapes: TLShape[] = []
	for (const item of candidateItems) {
		const parsedUpdate = FocusedShapeUpdateSchema.safeParse(item)
		if (!parsedUpdate.success) continue

		const update = parsedUpdate.data
		const existingShape = baseShapesById.get(normalizeShapeId(update.shapeId))
		if (!existingShape) continue

		try {
			const existingFocused = convertTldrawRecordToFocusedShape(existingShape)
			const merged = deepMerge(existingFocused, {
				...update,
				shapeId: toSimpleShapeId(update.shapeId),
				_type: update._type ?? existingFocused._type,
			}) as FocusedShape
			previewShapes.push(convertFocusedShapeToTldrawRecord(merged))
		} catch {
			// Ignore unsupported update previews.
		}
	}

	return previewShapes
}

function toDeletePreviewSnapshot(
	value: unknown,
	isPartial: boolean,
	committed: CanvasSnapshot
): CanvasSnapshot | null {
	const candidateItems = parsePreviewArray(value, isPartial)
	const shapeIds = candidateItems.filter((item): item is string => typeof item === 'string')
	if (shapeIds.length <= 0) return null

	const idsToDelete = new Set(shapeIds.map((shapeId) => normalizeShapeId(shapeId)))
	const filteredShapes = committed.shapes.filter((shape) => !idsToDelete.has(shape.id))
	if (filteredShapes.length === committed.shapes.length) return null

	return {
		shapes: filteredShapes.map((shape) => structuredClone(shape)),
	}
}

function mergeShapesById(base: TLShape[], additions: TLShape[]): TLShape[] {
	const merged = new Map<string, TLShape>()
	for (const shape of base) {
		merged.set(shape.id, structuredClone(shape))
	}
	for (const shape of additions) {
		merged.set(shape.id, structuredClone(shape))
	}
	return [...merged.values()]
}

function applySnapshot(editor: Editor, snapshot: CanvasSnapshot) {
	const nextShapes = snapshot.shapes.map((shape) => structuredClone(shape))

	editor.store.mergeRemoteChanges(() => {
		editor.run(
			() => {
				const existingIds = [...editor.getCurrentPageShapeIds()]
				if (existingIds.length > 0) {
					editor.deleteShapes(existingIds)
				}
				if (nextShapes.length <= 0) return

				const pageId = editor.getCurrentPageId()
				const nextIndexByParent = new Map<string, ReturnType<Editor['getHighestIndexForParent']>>()

				for (const shape of nextShapes) {
					const parentId =
						typeof shape.parentId === 'string' && shape.parentId.length > 0
							? shape.parentId
							: pageId

					shape.parentId = parentId

					if (!nextIndexByParent.has(parentId)) {
						nextIndexByParent.set(parentId, editor.getHighestIndexForParent(parentId))
					}

					const nextIndex = nextIndexByParent.get(parentId)!
					shape.index = nextIndex
					nextIndexByParent.set(parentId, getIndexAbove(nextIndex))
				}

				editor.createShapes(nextShapes)
			},
			{ history: 'ignore' }
		)
	})
}

/**
 * Non-destructive preview apply: adds new shapes and updates existing ones
 * without deleting user-drawn shapes. Only removes committed shapes that
 * are absent from the preview (e.g. when createFromBlank clears the canvas).
 */
function applyPreviewToEditor(
	editor: Editor,
	snapshot: CanvasSnapshot,
	committedSnapshot: CanvasSnapshot
) {
	const nextShapes = snapshot.shapes.map((shape) => structuredClone(shape))
	const nextShapeIds = new Set(nextShapes.map((s) => s.id))
	const committedIds = new Set(committedSnapshot.shapes.map((s) => s.id))

	editor.store.mergeRemoteChanges(() => {
		editor.run(
			() => {
				const existingIds = [...editor.getCurrentPageShapeIds()]
				const toDelete = existingIds.filter((id) => committedIds.has(id) && !nextShapeIds.has(id))
				if (toDelete.length > 0) {
					editor.deleteShapes(toDelete)
				}

				if (nextShapes.length <= 0) return

				const remainingIds = new Set([...editor.getCurrentPageShapeIds()])
				const pageId = editor.getCurrentPageId()
				const nextIndexByParent = new Map<string, ReturnType<Editor['getHighestIndexForParent']>>()

				const toCreate: TLShape[] = []
				const toUpdate: TLShape[] = []

				for (const shape of nextShapes) {
					const parentId =
						typeof shape.parentId === 'string' && shape.parentId.length > 0
							? shape.parentId
							: pageId
					shape.parentId = parentId

					if (remainingIds.has(shape.id)) {
						toUpdate.push(shape)
					} else {
						if (!nextIndexByParent.has(parentId)) {
							nextIndexByParent.set(parentId, editor.getHighestIndexForParent(parentId))
						}
						const nextIndex = nextIndexByParent.get(parentId)!
						shape.index = nextIndex
						nextIndexByParent.set(parentId, getIndexAbove(nextIndex))
						toCreate.push(shape)
					}
				}

				if (toUpdate.length > 0) editor.updateShapes(toUpdate)
				if (toCreate.length > 0) editor.createShapes(toCreate)
			},
			{ history: 'ignore' }
		)
	})
}

function TldrawCanvas({ app }: { app: App }) {
	const editorRef = useRef<Editor | null>(null)
	const pendingPreviewSnapshotRef = useRef<CanvasSnapshot | null>(null)
	const previewActiveRef = useRef(false)
	const createFromBlankPreviewRef = useRef(false)
	const committedSnapshotRef = useRef<CanvasSnapshot>({ shapes: [] })
	const removeStoreListenerRef = useRef<(() => void) | null>(null)
	const contextTimerRef = useRef<number | null>(null)

	const renderPreviewSnapshot = useCallback((previewSnapshot: CanvasSnapshot, summary: string) => {
		previewActiveRef.current = true

		const editor = editorRef.current
		if (!editor) {
			pendingPreviewSnapshotRef.current = previewSnapshot
			return
		}

		applyPreviewToEditor(editor, previewSnapshot, committedSnapshotRef.current)
		log(summary)
	}, [])

	const renderPreviewShapes = useCallback(
		(previewShapes: TLShape[], mode: 'create' | 'update', createFromBlank = false) => {
			if (previewShapes.length <= 0) return
			const committed = committedSnapshotRef.current
			const editor = editorRef.current
			const baseShapes = createFromBlank
				? []
				: editor
					? [...editor.getCurrentPageShapes()]
					: committed.shapes
			const previewSnapshot: CanvasSnapshot = {
				shapes: createFromBlank
					? previewShapes.map((shape) => structuredClone(shape))
					: mergeShapesById(baseShapes, previewShapes),
			}
			renderPreviewSnapshot(
				previewSnapshot,
				mode === 'create' && createFromBlank
					? `Applied create preview on blank canvas (${previewShapes.length} shape(s))`
					: `Applied ${mode} preview (${previewShapes.length} shape(s))`
			)
		},
		[renderPreviewSnapshot]
	)

	const clearPreviewAndRestoreCommitted = useCallback((reason: string) => {
		if (!previewActiveRef.current) return
		previewActiveRef.current = false
		createFromBlankPreviewRef.current = false
		pendingPreviewSnapshotRef.current = null
		const editor = editorRef.current
		if (editor) {
			applySnapshot(editor, committedSnapshotRef.current)
		}
		log(`Cleared stream preview (${reason})`)
	}, [])

	const pushAllState = useCallback(
		(editor: Editor) => {
			pushCanvasContext(app, editor)
			pushCanvasStateToServer(app, editor)
		},
		[app]
	)

	const scheduleContextPush = useCallback(() => {
		if (contextTimerRef.current !== null) {
			window.clearTimeout(contextTimerRef.current)
		}
		contextTimerRef.current = window.setTimeout(() => {
			contextTimerRef.current = null
			const editor = editorRef.current
			if (editor) {
				pushAllState(editor)
			}
		}, CONTEXT_DEBOUNCE_MS)
	}, [pushAllState])

	const applyPreviewFromToolInput = useCallback(
		(input: unknown, isPartial: boolean) => {
			const committed = committedSnapshotRef.current

			const args = extractToolArguments(input)
			if (!args) return

			const isCreateCall = args.shapesJson !== undefined || args.new_blank_canvas !== undefined
			const isUpdateCall = args.updatesJson !== undefined
			const isDeleteCall = args.shapeIdsJson !== undefined

			if (isUpdateCall || isDeleteCall) {
				createFromBlankPreviewRef.current = false
			}

			if (isCreateCall) {
				if (args.new_blank_canvas === undefined) {
					createFromBlankPreviewRef.current = false
				}
				const blankFlag = parseNewBlankCanvasFlag(args.new_blank_canvas, isPartial)
				if (blankFlag === true) createFromBlankPreviewRef.current = true
				if (blankFlag === false) createFromBlankPreviewRef.current = false
			}

			const createPreviewShapes = toCreatePreviewShapes(args.shapesJson, isPartial)
			if (createPreviewShapes.length > 0) {
				renderPreviewShapes(createPreviewShapes, 'create', createFromBlankPreviewRef.current)
				return
			}

			const editor = editorRef.current
			const liveShapes = editor ? [...editor.getCurrentPageShapes()] : committed.shapes
			const updatePreviewShapes = toUpdatePreviewShapes(args.updatesJson, isPartial, liveShapes)
			if (updatePreviewShapes.length > 0) {
				renderPreviewShapes(updatePreviewShapes, 'update')
				return
			}

			const liveForDelete: CanvasSnapshot = {
				shapes: editor ? [...editor.getCurrentPageShapes()] : committed.shapes,
			}
			const deletePreviewSnapshot = toDeletePreviewSnapshot(
				args.shapeIdsJson,
				isPartial,
				liveForDelete
			)
			if (!deletePreviewSnapshot) return

			const deletedCount = liveForDelete.shapes.length - deletePreviewSnapshot.shapes.length
			renderPreviewSnapshot(
				deletePreviewSnapshot,
				`Applied delete preview (${deletedCount} shape(s))`
			)
		},
		[renderPreviewShapes, renderPreviewSnapshot]
	)

	useEffect(() => {
		log('TldrawCanvas mounted')
		app.onteardown = async () => {
			log('onteardown called')
			return {}
		}

		app.ontoolinputpartial = (input) => {
			applyPreviewFromToolInput(input, true)
		}

		app.ontoolinput = (input) => {
			applyPreviewFromToolInput(input, false)
		}

		app.ontoolresult = (result) => {
			const mutation = parseMutationFromToolResult(result)
			if (!mutation) return

			// Clear preview state
			previewActiveRef.current = false
			createFromBlankPreviewRef.current = false
			pendingPreviewSnapshotRef.current = null

			const editor = editorRef.current
			if (!editor) return

			applyMutation(editor, mutation)

			// Update committed snapshot from current editor state
			committedSnapshotRef.current = {
				shapes: [...editor.getCurrentPageShapes()].map((s) => structuredClone(s)),
			}

			pushAllState(editor)
			log(`Applied ${mutation.action} mutation`)
		}

		app.ontoolcancelled = (params) => {
			const reason = params.reason ?? 'tool cancelled'
			clearPreviewAndRestoreCommitted(reason)
		}

		return () => {
			if (contextTimerRef.current !== null) {
				window.clearTimeout(contextTimerRef.current)
				contextTimerRef.current = null
			}
			removeStoreListenerRef.current?.()
			removeStoreListenerRef.current = null
			log('TldrawCanvas unmounted!')
		}
	}, [app, applyPreviewFromToolInput, clearPreviewAndRestoreCommitted, pushAllState])

	const handleMount = useCallback(
		(editor: Editor) => {
			log('Tldraw editor onMount fired')
			editorRef.current = editor

			removeStoreListenerRef.current?.()
			removeStoreListenerRef.current = editor.store.listen(
				() => {
					scheduleContextPush()
				},
				{ source: 'user', scope: 'document' }
			)

			// Hydrate from previous canvas state
			void fetchInitialShapes(app).then((shapes) => {
				if (shapes.length > 0) {
					const snapshot: CanvasSnapshot = { shapes }
					committedSnapshotRef.current = snapshot
					// Only apply if no preview is active (streaming may have started)
					if (!previewActiveRef.current) {
						applySnapshot(editor, snapshot)
					}
					log(`Hydrated ${shapes.length} shape(s) from previous canvas`)
				}
			})

			const pendingPreviewSnapshot = pendingPreviewSnapshotRef.current
			if (pendingPreviewSnapshot) {
				pendingPreviewSnapshotRef.current = null
				applySnapshot(editor, pendingPreviewSnapshot)
			}
		},
		[app, scheduleContextPush]
	)

	return (
		<div style={{ width: '100%', height: EDITOR_HEIGHT, position: 'relative' }}>
			<Tldraw
				licenseKey="tldraw-claude-mcp-content-2027-01-12/WyJ4c0lDTDVaTCIsWyIqLmNsYXVkZW1jcGNvbnRlbnQuY29tIl0sMTYsIjIwMjctMDEtMTIiXQ.RAN4FAIUQ8hjQl6Brwa9CKlZFontsjf/W3xk+gl+PThOE0M4sIT7RzWWykYSj/HjsAwCoPpJ2OsImBZIw71Yag"
				onMount={handleMount}
			/>
		</div>
	)
}

function McpApp() {
	const handleAppCreated = useCallback((instance: App) => {
		log('App created via useApp')
		instance.onerror = (err) => log(`App.onerror: ${err}`)
		instance.onhostcontextchanged = (ctx) => {
			log(`hostcontext: ${JSON.stringify(ctx)}`)
		}
	}, [])

	const { app, isConnected, error } = useApp({
		appInfo: { name: 'tldraw', version: '1.0.0' },
		capabilities: {},
		onAppCreated: handleAppCreated,
	})

	useEffect(() => {
		if (!app || !isConnected) return
		const connectedApp = app

		let cancelled = false

		async function sendInitialSize() {
			try {
				log('Connected!')
				await connectedApp.requestDisplayMode({ mode: 'inline' })
				if (!cancelled) {
					log('App ready, rendering tldraw')
				}
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err)
				if (!cancelled) log(`Error sending initial ui request: ${msg}`)
			}
		}

		void sendInitialSize()
		return () => {
			cancelled = true
			log('McpApp cleanup')
		}
	}, [app, isConnected])

	const status = isConnected ? 'ready' : 'connecting'

	return (
		<div>
			<div
				id="debug"
				style={{
					position: 'fixed',
					bottom: 0,
					left: 0,
					right: 0,
					background: 'rgba(0,0,0,0.85)',
					color: '#0f0',
					fontFamily: 'monospace',
					fontSize: 11,
					padding: 8,
					zIndex: 999999,
					maxHeight: 150,
					overflow: 'auto',
					whiteSpace: 'pre',
				}}
			>
				{debugLines.join('\n')}
			</div>
			{error ? (
				<div style={{ padding: 20, color: 'red' }}>Error: {error.message}</div>
			) : !isConnected || !app ? (
				<div style={{ padding: 20, opacity: 0.5 }}>Status: {status}</div>
			) : (
				<TldrawCanvas app={app} />
			)}
		</div>
	)
}

createRoot(document.getElementById('root')!).render(<McpApp />)
