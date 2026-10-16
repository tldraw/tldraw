import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { Box, Editor, TldrawFileParseError, parseTldrawJsonFile, serializeTldrawJson } from 'tldraw'
import { CELL_H, CELL_W } from '../editor/constants'

/** The localStorage key tldraw keeps user preferences under (TLUserPreferences.ts:7). */
export const USER_PREFS_STORAGE_KEY = 'TLDRAW_USER_DATA_v3'

export interface FileOk {
	ok: true
}
export interface FileError {
	ok: false
	error: string
}
export type FileResult = FileOk | FileError

export function describeParseError(error: TldrawFileParseError): string {
	switch (error.type) {
		case 'v1File':
			return 'This is a tldraw v1 file; open it on tldraw.com to convert it'
		case 'notATldrawFile':
			return 'Not a tldraw file'
		case 'fileFormatVersionTooNew':
			return `File format version ${error.version} is newer than this app supports`
		case 'migrationFailed':
			return `Could not migrate the file (${error.reason})`
		case 'invalidRecords':
			return 'The file contains invalid records'
		default:
			return 'Could not read the file'
	}
}

/**
 * Computes geometry and page bounds for every shape so the first interactive frame after a load is
 * not a 40–110 ms stall (cold geometry for 500 shapes measured at 36 ms, 2000 at 74 ms).
 */
export function preWarmGeometry(editor: Editor): void {
	for (const id of editor.getCurrentPageShapeIds()) {
		editor.getShapePageBounds(id)
	}
}

/**
 * Loads `.tldr` JSON into the editor, replacing the document, like tldraw's own parseAndLoadDocument
 * (packages/tldraw/src/lib/utils/tldr/file.ts:302-313): snapshot, cleared history, fit the camera.
 */
export function loadTldrJson(editor: Editor, json: string): FileResult {
	const result = parseTldrawJsonFile({ json, schema: editor.store.schema })
	if (!result.ok) return { ok: false, error: describeParseError(result.error) }
	const snapshot = result.value.getStoreSnapshot()
	editor.run(() => {
		editor.loadSnapshot(snapshot)
		editor.clearHistory()
		editor.zoomToFit({ immediate: true })
	})
	preWarmGeometry(editor)
	return { ok: true }
}

export async function loadTldrFile(editor: Editor, path: string): Promise<FileResult> {
	let json: string
	try {
		json = await readFile(resolve(path), 'utf8')
	} catch (e) {
		return { ok: false, error: `Could not read ${path}: ${describeError(e)}` }
	}
	try {
		return loadTldrJson(editor, json)
	} catch (e) {
		return { ok: false, error: `Could not load ${path}: ${describeError(e)}` }
	}
}

/** Serialises the document and writes it atomically (temp file + rename), creating directories. */
export async function saveTldrFile(editor: Editor, path: string): Promise<FileResult> {
	try {
		const json = await serializeTldrawJson(editor)
		await writeFileAtomic(resolve(path), json)
		return { ok: true }
	} catch (e) {
		return { ok: false, error: `Could not save ${path}: ${describeError(e)}` }
	}
}

async function writeFileAtomic(path: string, data: string) {
	await mkdir(dirname(path), { recursive: true })
	const tmp = `${path}.${process.pid}.tmp`
	await writeFile(tmp, data, 'utf8')
	await rename(tmp, path)
}

function describeError(e: unknown): string {
	return e instanceof Error ? e.message : String(e)
}

/**
 * Document dirtiness: fires on user-sourced changes to document-scoped records (shapes, pages,
 * assets, bindings), never on camera/selection/instance changes. Returns the unsubscribe.
 */
export function watchDocumentChanges(editor: Editor, onChange: () => void): () => void {
	return editor.store.listen(onChange, { scope: 'document', source: 'user' })
}

// ---------------------------------------------------------------------------------------------
// User preferences: tldraw persists them in localStorage, which jsdom keeps in memory per run, so
// the value is seeded from a prefs file before tldraw loads and written back on exit.
// ---------------------------------------------------------------------------------------------

export function getPrefsPath(env: NodeJS.ProcessEnv = process.env): string {
	const base =
		env.XDG_CONFIG_HOME && env.XDG_CONFIG_HOME !== ''
			? env.XDG_CONFIG_HOME
			: join(homedir(), '.config')
	return join(base, 'tldraw-tui', 'prefs.json')
}

/**
 * Reads the prefs file into the `seedLocalStorage` shape `installDomGlobals` takes. Missing or
 * corrupt files yield an empty seed (tldraw then starts with fresh preferences).
 */
export async function readPrefsSeed(path = getPrefsPath()): Promise<Record<string, string>> {
	try {
		const raw = await readFile(path, 'utf8')
		const parsed = JSON.parse(raw) as unknown
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			const seed: Record<string, string> = {}
			for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
				if (typeof value === 'string') seed[key] = value
			}
			return seed
		}
	} catch {
		// absent or unreadable prefs are the same as no prefs
	}
	return {}
}

export interface StorageLike {
	getItem(key: string): string | null
}

/** Writes the current preferences back to the prefs file (JSON object keyed like localStorage). */
export async function persistPrefs(
	storage: StorageLike = globalThis.localStorage,
	path = getPrefsPath()
): Promise<FileResult> {
	try {
		const value = storage.getItem(USER_PREFS_STORAGE_KEY)
		if (value === null) return { ok: true }
		await writeFileAtomic(
			path,
			JSON.stringify({ [USER_PREFS_STORAGE_KEY]: value }, null, '\t') + '\n'
		)
		return { ok: true }
	} catch (e) {
		return { ok: false, error: `Could not save preferences: ${describeError(e)}` }
	}
}

// ---------------------------------------------------------------------------------------------
// Export as text. The renderer lives in render/ (wave 3); this module only decides what to draw and
// writes the result.
// ---------------------------------------------------------------------------------------------

export interface ExportTextOptions {
	/** Export the selection instead of the whole page. */
	selectionOnly?: boolean
	/** Caps on the offscreen screen size, default 4000 × 1000 cells. */
	maxCols?: number
	maxRows?: number
	/** Blank cells around the content, default 1. */
	padCells?: number
}

export interface ExportTextRequest {
	/** Page-space bounds to render (content plus padding). */
	bounds: Box
	/** Zoom to render at: the current zoom, reduced when the content would exceed the caps. */
	zoom: number
	cols: number
	rows: number
}

export type RenderToText = (editor: Editor, request: ExportTextRequest) => string

/** Null when there is nothing to export (empty page or empty selection). */
export function computeExportRequest(
	editor: Editor,
	opts: ExportTextOptions = {}
): ExportTextRequest | null {
	const content = opts.selectionOnly
		? editor.getSelectionPageBounds()
		: (editor.getCurrentPageBounds() ?? null)
	if (!content || content.w <= 0 || content.h <= 0) return null
	const maxCols = opts.maxCols ?? 4000
	const maxRows = opts.maxRows ?? 1000
	const pad = opts.padCells ?? 1
	let zoom = editor.getZoomLevel()
	const innerCols = Math.max(1, maxCols - pad * 2)
	const innerRows = Math.max(1, maxRows - pad * 2)
	zoom = Math.min(zoom, (innerCols * CELL_W) / content.w, (innerRows * CELL_H) / content.h)
	const cols = Math.ceil((content.w * zoom) / CELL_W) + pad * 2
	const rows = Math.ceil((content.h * zoom) / CELL_H) + pad * 2
	const padX = (pad * CELL_W) / zoom
	const padY = (pad * CELL_H) / zoom
	const bounds = new Box(
		content.x - padX,
		content.y - padY,
		(cols * CELL_W) / zoom,
		(rows * CELL_H) / zoom
	)
	return { bounds, zoom, cols, rows }
}

export function exportText(
	editor: Editor,
	renderToText: RenderToText,
	opts: ExportTextOptions = {}
): string {
	const request = computeExportRequest(editor, opts)
	return request ? renderToText(editor, request) : ''
}

export async function exportTextFile(
	editor: Editor,
	path: string,
	renderToText: RenderToText,
	opts: ExportTextOptions = {}
): Promise<FileResult> {
	try {
		const text = exportText(editor, renderToText, opts)
		await writeFileAtomic(resolve(path), text.endsWith('\n') ? text : text + '\n')
		return { ok: true }
	} catch (e) {
		return { ok: false, error: `Could not export ${path}: ${describeError(e)}` }
	}
}
