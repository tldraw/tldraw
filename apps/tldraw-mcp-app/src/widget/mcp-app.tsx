import { ClerkProvider, SignInButton, useAuth } from '@clerk/clerk-react'
import { type App, useApp } from '@modelcontextprotocol/ext-apps/react'
import React, {
	Component,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react'
import { createRoot } from 'react-dom/client'
import {
	type TLComponents,
	type TLShape,
	type TLShapeId,
	Box,
	Editor,
	Tldraw,
	getIndexAbove,
	structuredClone,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import {
	type FocusedShape,
	FocusedShapeSchema,
	FocusedShapeUpdateSchema,
	convertFocusedShapeToTldrawRecord,
	convertTldrawRecordToFocusedShape,
} from '../focused-shape'
import { healJsonArrayString } from '../parse-json'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string

// --- Clerk auth context ---
// Decouples Clerk from TldrawCanvas so a Clerk init failure doesn't kill the canvas.

interface AuthState {
	isSignedIn: boolean
	clerkReady: boolean
}

const AuthContext = createContext<AuthState>({ isSignedIn: false, clerkReady: false })

function ClerkAuthSync({ children }: { children: React.ReactNode }) {
	const { isSignedIn } = useAuth()
	useEffect(() => {
		log(`Clerk ready, isSignedIn=${isSignedIn ?? false}`)
	}, [isSignedIn])
	return (
		<AuthContext.Provider value={{ isSignedIn: isSignedIn ?? false, clerkReady: true }}>
			{children}
		</AuthContext.Provider>
	)
}

class ClerkBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
	state = { failed: false }
	static getDerivedStateFromError(error: Error) {
		log(`Clerk init failed: ${error.message}`)
		return { failed: true }
	}
	render() {
		if (this.state.failed) {
			// Clerk failed to init — render children without auth (canvas still shows)
			return <>{this.props.children}</>
		}
		return (
			<ClerkProvider
				publishableKey={PUBLISHABLE_KEY}
				routerPush={(to) => log(`Clerk navigate: ${to}`)}
				routerReplace={(to) => log(`Clerk navigate: ${to}`)}
			>
				<ClerkAuthSync>{this.props.children}</ClerkAuthSync>
			</ClerkProvider>
		)
	}
}

const EDITOR_HEIGHT = 600
const SAVE_DEBOUNCE_MS = 500

interface CanvasSnapshot {
	shapes: TLShape[]
}

const DEBUG_KEY = 'tldraw-mcp-debug'
const debugLines: string[] = (() => {
	try {
		const prev = sessionStorage.getItem(DEBUG_KEY)
		return prev ? [...prev.split('\n'), '--- reload ---'] : []
	} catch {
		return []
	}
})()

function log(msg: string) {
	debugLines.push(`${new Date().toISOString().slice(11, 23)} ${msg}`)
	const el = document.getElementById('debug')
	if (el) el.textContent = debugLines.join('\n')
	try {
		sessionStorage.setItem(DEBUG_KEY, debugLines.slice(-200).join('\n'))
	} catch {}
}

window.addEventListener('error', (e) => log(`ERROR: ${e.message}`))
window.addEventListener('unhandledrejection', (e) => log(`REJECTION: ${e.reason}`))
document.addEventListener('securitypolicyviolation', (e) =>
	log(`CSP blocked: ${e.blockedURI} (${e.violatedDirective})`)
)
log(`origin: ${window.location.origin} href: ${window.location.href}`)

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

// --- localStorage persistence ---

function localStorageKey(checkpointId: string): string {
	return `tldraw:${checkpointId}`
}

function loadLocalShapes(checkpointId: string): TLShape[] | null {
	try {
		const raw = localStorage.getItem(localStorageKey(checkpointId))
		if (!raw) return null
		const parsed = JSON.parse(raw)
		if (!Array.isArray(parsed)) return null
		const shapes = parsed.filter(
			(s: unknown): s is TLShape =>
				isRecord(s) && typeof s.id === 'string' && typeof s.type === 'string'
		)
		return shapes.length > 0 ? shapes : null
	} catch {
		return null
	}
}

function saveLocalShapes(checkpointId: string, shapes: TLShape[]): void {
	try {
		localStorage.setItem(localStorageKey(checkpointId), JSON.stringify(shapes))
		// Also track this as the latest checkpoint so future widgets can find it
		localStorage.setItem('tldraw:latest-checkpoint', checkpointId)
	} catch {
		// localStorage may be full or unavailable.
	}
}

function getLatestCheckpointShapes(): TLShape[] | null {
	try {
		const latestId = localStorage.getItem('tldraw:latest-checkpoint')
		if (!latestId) return null
		return loadLocalShapes(latestId)
	} catch {
		return null
	}
}

// --- Tool result parsing ---

function toSnapshotShapesFromRecords(value: unknown): TLShape[] | null {
	if (!Array.isArray(value)) return null
	return value.filter(
		(shape): shape is TLShape =>
			isRecord(shape) && typeof shape.id === 'string' && typeof shape.type === 'string'
	)
}

interface CheckpointResult {
	checkpointId: string
	shapes: TLShape[]
	action: string | null
	/** True if the server found base shapes to merge with (for create action). */
	hadBaseShapes: boolean
	/** True if the server started from a blank canvas (for create action). */
	newBlankCanvas: boolean
}

function parseCheckpointFromToolResult(result: unknown): CheckpointResult | null {
	if (!isRecord(result)) return null
	const sc = result.structuredContent
	if (!isRecord(sc)) return null
	const checkpointId = typeof sc.checkpointId === 'string' ? sc.checkpointId : null
	if (!checkpointId) return null
	const shapes = toSnapshotShapesFromRecords(sc.tldrawRecords)
	if (!shapes) return null
	return {
		checkpointId,
		shapes,
		action: typeof sc.action === 'string' ? sc.action : null,
		hadBaseShapes: sc.hadBaseShapes === true,
		newBlankCanvas: sc.newBlankCanvas === true,
	}
}

// --- Canvas context push ---

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

function saveCheckpointToServer(app: App, checkpointId: string, editor: Editor) {
	const shapes = [...editor.getCurrentPageShapes()].map((s) => structuredClone(s))
	app
		.callServerTool({
			name: 'save_checkpoint',
			arguments: { checkpointId, shapesJson: JSON.stringify(shapes) },
		})
		.catch(() => {
			// Best-effort; failure is non-fatal.
		})
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

const CAMERA_ANIM_MS = 300
let cameraAnimEndTime = 0

/**
 * If any of the given shape IDs extend outside the current viewport,
 * pan (and only zoom out if necessary) to keep them visible.
 * Never zooms in beyond the current zoom level.
 * Skips the call if a previous animation is still playing.
 */
function zoomToFitRequestShapes(editor: Editor, shapeIds: Set<TLShapeId>) {
	if (shapeIds.size === 0) return

	// Don't interrupt an in-progress animation — wait for it to finish
	if (Date.now() < cameraAnimEndTime) return

	const shapeBounds: Box[] = []
	for (const id of shapeIds) {
		const bounds = editor.getShapePageBounds(id)
		if (bounds) shapeBounds.push(bounds)
	}
	if (shapeBounds.length === 0) return

	const commonBounds = Box.Common(shapeBounds)
	const viewportBounds = editor.getViewportPageBounds()

	// All request shapes already visible — nothing to do
	const contained =
		commonBounds.x >= viewportBounds.x &&
		commonBounds.y >= viewportBounds.y &&
		commonBounds.x + commonBounds.w <= viewportBounds.x + viewportBounds.w &&
		commonBounds.y + commonBounds.h <= viewportBounds.y + viewportBounds.h
	if (contained) return

	const currentZoom = editor.getZoomLevel()
	const screenBounds = editor.getViewportScreenBounds()
	const inset = 100

	// The zoom level needed to fit the shapes with padding
	const fitZoom = Math.min(
		(screenBounds.w - inset) / commonBounds.w,
		(screenBounds.h - inset) / commonBounds.h
	)

	// Never zoom in past the current level — only zoom out if shapes don't fit
	const zoom = Math.min(currentZoom, fitZoom)

	// Center the shapes in the viewport at the chosen zoom
	const cx = commonBounds.x + commonBounds.w / 2
	const cy = commonBounds.y + commonBounds.h / 2

	cameraAnimEndTime = Date.now() + CAMERA_ANIM_MS

	editor.setCamera(
		{
			x: -cx + screenBounds.w / zoom / 2,
			y: -cy + screenBounds.h / zoom / 2,
			z: zoom,
		},
		{ animation: { duration: CAMERA_ANIM_MS } }
	)
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

// --- TLDR export ---

function collectPageBindings(editor: Editor) {
	const seen = new Set<string>()
	const bindings: unknown[] = []
	for (const shape of editor.getCurrentPageShapes()) {
		for (const binding of editor.getBindingsInvolvingShape(shape)) {
			if (seen.has(binding.id)) continue
			seen.add(binding.id)
			bindings.push(structuredClone(binding))
		}
	}
	return bindings
}

function buildTldrDocument(editor: Editor) {
	const shapes = [...editor.getCurrentPageShapes()].map((s) => structuredClone(s))
	const bindings = collectPageBindings(editor)

	return {
		tldrawFileFormatVersion: 1,
		schema: {
			schemaVersion: 2,
			sequences: {
				'com.tldraw.store': 4,
				'com.tldraw.asset': 1,
				'com.tldraw.camera': 1,
				'com.tldraw.document': 2,
				'com.tldraw.instance': 25,
				'com.tldraw.instance_page_state': 5,
				'com.tldraw.page': 1,
				'com.tldraw.shape': 4,
				'com.tldraw.instance_presence': 5,
				'com.tldraw.pointer': 1,
			},
		},
		records: [
			{
				typeName: 'page',
				id: 'page:page',
				name: 'Page 1',
				index: 'a1',
				meta: {},
			},
			...shapes,
			...bindings,
		],
	}
}

function exportTldr(editor: Editor) {
	const doc = buildTldrDocument(editor)
	const json = JSON.stringify(doc, null, 2)

	// Copy to clipboard
	navigator.clipboard.writeText(json).catch(() => {
		// Clipboard may be unavailable in some contexts.
	})

	log(json)

	// Download file
	const blob = new Blob([json], { type: 'application/json' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = 'diagram.tldr'
	a.click()
	URL.revokeObjectURL(url)
}

function ExportTldrButton() {
	const editor = useEditor()
	return (
		<div className="tlui-share-zone" draggable={false}>
			<button
				className="tlui-button tlui-button__normal"
				onClick={() => exportTldr(editor)}
				title="Copy to clipboard and download .tldr file"
			>
				Export .tldr
			</button>
		</div>
	)
}

const tldrawComponents: TLComponents = {
	SharePanel: ExportTldrButton,
}

function TldrawCanvas({ app }: { app: App }) {
	const editorRef = useRef<Editor | null>(null)
	const pendingSnapshotRef = useRef<CanvasSnapshot | null>(null)
	const pendingPreviewSnapshotRef = useRef<CanvasSnapshot | null>(null)
	const previewActiveRef = useRef(false)
	const createFromBlankPreviewRef = useRef(false)
	const committedSnapshotRef = useRef<CanvasSnapshot>({ shapes: [] })
	const checkpointIdRef = useRef<string | null>(null)
	const removeStoreListenerRef = useRef<(() => void) | null>(null)
	const saveTimerRef = useRef<number | null>(null)
	const requestShapeIdsRef = useRef<Set<TLShapeId>>(new Set())

	const { isSignedIn, clerkReady } = useContext(AuthContext)
	const isSignedInRef = useRef(isSignedIn)
	const [showAuthPrompt, setShowAuthPrompt] = useState(false)

	useEffect(() => {
		isSignedInRef.current = isSignedIn
		if (isSignedIn) setShowAuthPrompt(false)
	}, [isSignedIn])

	const renderPreviewSnapshot = useCallback((previewSnapshot: CanvasSnapshot, summary: string) => {
		previewActiveRef.current = true

		const editor = editorRef.current
		if (!editor) {
			pendingPreviewSnapshotRef.current = previewSnapshot
			return
		}

		applyPreviewToEditor(editor, previewSnapshot, committedSnapshotRef.current)
		zoomToFitRequestShapes(editor, requestShapeIdsRef.current)
		log(summary)
	}, [])

	const renderPreviewShapes = useCallback(
		(previewShapes: TLShape[], mode: 'create' | 'update', createFromBlank = false) => {
			if (previewShapes.length <= 0) return
			for (const shape of previewShapes) {
				requestShapeIdsRef.current.add(shape.id)
			}
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

	const scheduleSave = useCallback(() => {
		if (saveTimerRef.current !== null) {
			window.clearTimeout(saveTimerRef.current)
		}
		saveTimerRef.current = window.setTimeout(() => {
			saveTimerRef.current = null
			const editor = editorRef.current
			const cpId = checkpointIdRef.current
			if (!editor) return

			// Push model context
			pushCanvasContext(app, editor)

			// Persist to localStorage + server
			if (cpId) {
				const shapes = [...editor.getCurrentPageShapes()].map((s) => structuredClone(s))
				saveLocalShapes(cpId, shapes)
				saveCheckpointToServer(app, cpId, editor)
			}
		}, SAVE_DEBOUNCE_MS)
	}, [app])

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

		// Pre-populate with latest checkpoint so streaming preview and update/delete
		// have the existing canvas shapes as their base. This is the key to "forking":
		// when a new tool call starts streaming, the widget already shows the previous
		// canvas, and new shapes stream in on top.
		const latestShapes = getLatestCheckpointShapes()
		if (latestShapes && latestShapes.length > 0) {
			const snapshot: CanvasSnapshot = { shapes: latestShapes }
			committedSnapshotRef.current = snapshot
			const editor = editorRef.current
			if (editor) {
				applySnapshot(editor, snapshot)
			} else {
				pendingSnapshotRef.current = snapshot
			}
			log(`Pre-loaded ${latestShapes.length} shape(s) from latest checkpoint`)
		}

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
			const checkpoint = parseCheckpointFromToolResult(result)
			if (!checkpoint) return

			const {
				checkpointId,
				shapes: resultShapes,
				action,
				hadBaseShapes,
				newBlankCanvas,
			} = checkpoint
			checkpointIdRef.current = checkpointId

			// Clear preview state
			previewActiveRef.current = false
			createFromBlankPreviewRef.current = false
			pendingPreviewSnapshotRef.current = null

			// Check localStorage for user edits (handles remount case)
			const localShapes = loadLocalShapes(checkpointId)
			let finalShapes = localShapes ?? resultShapes

			// Client-side merge fallback: if the server didn't have base shapes for a create
			// (e.g. server process restarted between tool calls, losing in-memory state)
			// and this wasn't a blank canvas request, merge the new shapes with the latest
			// checkpoint from localStorage.
			if (!localShapes && action === 'create' && !hadBaseShapes && !newBlankCanvas) {
				const latestShapes = getLatestCheckpointShapes()
				if (latestShapes && latestShapes.length > 0) {
					log(`Server had no base shapes — merging locally from latest checkpoint`)
					finalShapes = mergeShapesById(latestShapes, resultShapes)
				}
			}

			// Capture previous committed IDs for zoom diff fallback
			const previousCommittedIds = new Set(committedSnapshotRef.current.shapes.map((s) => s.id))

			const snapshot: CanvasSnapshot = { shapes: finalShapes }
			committedSnapshotRef.current = snapshot

			const editor = editorRef.current
			if (!editor) {
				pendingSnapshotRef.current = snapshot
				requestShapeIdsRef.current = new Set<TLShapeId>()
				log(`Queued checkpoint ${checkpointId} (editor not ready)`)
				return
			}

			applySnapshot(editor, snapshot)

			// Zoom to fit shapes from this request — but skip if restoring
			// from localStorage (reload/remount case where user may have panned)
			if (!localShapes) {
				let zoomShapeIds: Set<TLShapeId> = requestShapeIdsRef.current
				if (zoomShapeIds.size === 0) {
					// No streaming preview happened — compute new shapes from diff
					const newIds = new Set<TLShapeId>()
					for (const shape of finalShapes) {
						if (!previousCommittedIds.has(shape.id)) newIds.add(shape.id)
					}
					zoomShapeIds = newIds
				}
				zoomToFitRequestShapes(editor, zoomShapeIds)
			}
			requestShapeIdsRef.current = new Set<TLShapeId>()

			// Persist to localStorage (ensures it's saved even on first render)
			saveLocalShapes(checkpointId, finalShapes)

			// Immediately push checkpoint to server so the next tool call can fork from it.
			// This is critical: the server may restart between tool calls, losing in-memory state.
			saveCheckpointToServer(app, checkpointId, editor)

			pushCanvasContext(app, editor)
			log(`Applied checkpoint ${checkpointId} (${finalShapes.length} shapes)`)
		}

		app.ontoolcancelled = (params) => {
			const reason = params.reason ?? 'tool cancelled'
			clearPreviewAndRestoreCommitted(reason)
			requestShapeIdsRef.current = new Set<TLShapeId>()
		}

		return () => {
			if (saveTimerRef.current !== null) {
				window.clearTimeout(saveTimerRef.current)
				saveTimerRef.current = null
			}
			removeStoreListenerRef.current?.()
			removeStoreListenerRef.current = null
			log('TldrawCanvas unmounted!')
		}
	}, [app, applyPreviewFromToolInput, clearPreviewAndRestoreCommitted])

	const handleMount = useCallback(
		(editor: Editor) => {
			log('Tldraw editor onMount fired')
			log(JSON.stringify(window.location, null, 2))
			editorRef.current = editor

			removeStoreListenerRef.current?.()
			removeStoreListenerRef.current = editor.store.listen(
				() => {
					scheduleSave()
				},
				{ source: 'user', scope: 'document' }
			)

			// Require auth for image uploads and pastes by intercepting DOM events
			// before tldraw handles them (capture phase runs first).
			const container = editor.getContainer()

			const onDrop = (e: DragEvent) => {
				const hasImages = [...(e.dataTransfer?.files ?? [])].some((f) =>
					f.type.startsWith('image/')
				)
				if (hasImages && !isSignedInRef.current) {
					e.preventDefault()
					e.stopPropagation()
					setShowAuthPrompt(true)
				}
			}

			const onPaste = (e: ClipboardEvent) => {
				const files = [...(e.clipboardData?.files ?? [])]
				const items = [...(e.clipboardData?.items ?? [])]
				const hasImageFiles = files.some((f) => f.type.startsWith('image/'))
				const hasImageItems = items.some((i) => i.kind === 'file' && i.type.startsWith('image/'))
				const hasImages = hasImageFiles || hasImageItems
				log(
					`paste: files=[${files.map((f) => f.type).join(',') || 'none'}] items=[${items.map((i) => `${i.kind}:${i.type}`).join(',') || 'none'}] hasImages=${hasImages} signedIn=${isSignedInRef.current}`
				)
				if (!hasImages) return

				if (!isSignedInRef.current) {
					e.preventDefault()
					e.stopPropagation()
					setShowAuthPrompt(true)
					log('paste: blocked (not signed in)')
					return
				}

				// Signed in: tldraw calls navigator.clipboard.read() (async) which is blocked
				// in the MCP iframe. By the time its rejection handler fires, e.clipboardData
				// is already cleared by the browser. Extract files synchronously here instead
				// and pass them directly to tldraw's putExternalContent.
				const imageFiles: File[] = []
				for (const item of items) {
					if (item.kind === 'file' && item.type.startsWith('image/')) {
						const file = item.getAsFile()
						if (file) imageFiles.push(file)
					}
				}
				for (const file of files) {
					if (file.type.startsWith('image/')) imageFiles.push(file)
				}

				if (imageFiles.length > 0) {
					e.preventDefault()
					e.stopPropagation()
					const editor = editorRef.current
					if (editor) {
						editor
							.putExternalContent({ type: 'files', files: imageFiles })
							.catch((err: unknown) => {
								log(`paste: putExternalContent failed: ${err}`)
							})
						log(`paste: handling ${imageFiles.length} image(s) via putExternalContent`)
					}
				}
			}

			container.addEventListener('drop', onDrop, { capture: true })
			document.addEventListener('paste', onPaste, { capture: true })

			const prevRemoveListener = removeStoreListenerRef.current
			removeStoreListenerRef.current = () => {
				prevRemoveListener?.()
				container.removeEventListener('drop', onDrop, { capture: true })
				document.removeEventListener('paste', onPaste, { capture: true })
			}

			// Apply any snapshot that arrived before the editor was ready
			const pendingSnapshot = pendingSnapshotRef.current
			if (pendingSnapshot) {
				pendingSnapshotRef.current = null
				applySnapshot(editor, pendingSnapshot)
				log(`Applied pending checkpoint snapshot`)
			}

			const pendingPreviewSnapshot = pendingPreviewSnapshotRef.current
			if (pendingPreviewSnapshot) {
				pendingPreviewSnapshotRef.current = null
				applySnapshot(editor, pendingPreviewSnapshot)
				zoomToFitRequestShapes(editor, requestShapeIdsRef.current)
			}
		},
		[scheduleSave]
	)

	return (
		<div style={{ width: '100%', height: EDITOR_HEIGHT, position: 'relative' }}>
			<Tldraw
				licenseKey="tldraw-claude---chatgpt-mcp-app-2027-02-26/WyI5NFRNbWVmbiIsWyIqLmNsYXVkZW1jcGNvbnRlbnQuY29tIiwiKi53ZWItc2FuZGJveC5vYWl1c2VyY29udGVudC5jb20iXSwxNiwiMjAyNy0wMi0yNiJd.5dV7DhEo4Ms3gr9PJ8qCFrmRrgh0XNYaBMJe299DvEDiNAf8imZeCSAkpmFD2Vcuw6H2uXJfBQkda6zKdnnEdA"
				onMount={handleMount}
				components={tldrawComponents}
			/>
			{showAuthPrompt && (
				<div
					style={{
						position: 'absolute',
						inset: 0,
						background: 'rgba(0,0,0,0.45)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 1000,
					}}
				>
					<div
						style={{
							background: 'white',
							borderRadius: 8,
							padding: '24px 28px',
							textAlign: 'center',
							maxWidth: 300,
							boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
						}}
					>
						<p style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.5, color: '#111' }}>
							Sign in to your tldraw account to upload images.
						</p>
						<div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
							{clerkReady ? (
								<SignInButton mode="modal">
									<button
										onClick={() => log('Sign in button clicked')}
										style={{
											padding: '8px 16px',
											background: '#2563eb',
											color: 'white',
											border: 'none',
											borderRadius: 6,
											cursor: 'pointer',
											fontSize: 14,
											fontWeight: 500,
										}}
									>
										Sign in
									</button>
								</SignInButton>
							) : (
								<a
									href="https://tldraw.com"
									target="_blank"
									rel="noreferrer"
									style={{
										padding: '8px 16px',
										background: '#2563eb',
										color: 'white',
										borderRadius: 6,
										textDecoration: 'none',
										fontSize: 14,
										fontWeight: 500,
									}}
								>
									Sign in at tldraw.com
								</a>
							)}
							<button
								onClick={() => setShowAuthPrompt(false)}
								style={{
									padding: '8px 16px',
									background: 'transparent',
									color: '#555',
									border: '1px solid #ddd',
									borderRadius: 6,
									cursor: 'pointer',
									fontSize: 14,
								}}
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
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
		<ClerkBoundary>
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
		</ClerkBoundary>
	)
}

createRoot(document.getElementById('root')!).render(<McpApp />)
