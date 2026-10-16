import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { Box, createShapeId, serializeTldrawJson, toRichText } from 'tldraw'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { CELL_H, CELL_W } from '../editor/constants'
import { TuiEditor, createTuiEditor } from '../editor/createTuiEditor'
import {
	ExportTextRequest,
	USER_PREFS_STORAGE_KEY,
	computeExportRequest,
	describeParseError,
	exportText,
	exportTextFile,
	getPrefsPath,
	loadTldrFile,
	loadTldrJson,
	persistPrefs,
	readPrefsSeed,
	saveTldrFile,
	watchDocumentChanges,
} from './tldrFile'

let dir: string
const editors: TuiEditor[] = []

function makeEditor(colorMode: 'light' | 'dark' = 'light') {
	const tui = createTuiEditor({ colorMode, cols: 100, rows: 30 })
	editors.push(tui)
	return tui.editor
}

function drawFixture(editor: TuiEditor['editor']) {
	editor.createShapes([
		{ id: createShapeId('a'), type: 'geo', x: 100, y: 100, props: { w: 200, h: 100 } },
		{
			id: createShapeId('b'),
			type: 'geo',
			x: 400,
			y: 100,
			props: { w: 120, h: 80, geo: 'ellipse', richText: toRichText('Label') },
		},
		{ id: createShapeId('t'), type: 'text', x: 50, y: 300, props: { richText: toRichText('hi') } },
	])
}

beforeAll(async () => {
	dir = await mkdtemp(join(tmpdir(), 'tldraw-tui-'))
})

afterAll(async () => {
	await rm(dir, { recursive: true, force: true })
})

afterEach(() => {
	for (const tui of editors.splice(0)) tui.dispose()
})

describe('save and load', () => {
	it('round-trips a document through a .tldr file in a new directory', async () => {
		const source = makeEditor()
		drawFixture(source)
		const path = join(dir, 'nested', 'deeper', 'doc.tldr')

		expect(await saveTldrFile(source, path)).toEqual({ ok: true })
		const raw = JSON.parse(await readFile(path, 'utf8')) as { tldrawFileFormatVersion: number }
		expect(raw.tldrawFileFormatVersion).toBeGreaterThan(0)
		// The temp file used for the atomic write is gone.
		await expect(stat(`${path}.${process.pid}.tmp`)).rejects.toThrow()

		const target = makeEditor()
		target.createShape({ id: createShapeId('old'), type: 'geo', x: 0, y: 0 })
		target.setCamera({ x: 500, y: 500, z: 2 }, { immediate: true })
		expect(await loadTldrFile(target, path)).toEqual({ ok: true })

		const byId = (shapes: { id: string }[]) => [...shapes].sort((a, b) => a.id.localeCompare(b.id))
		expect(byId(target.getCurrentPageShapes())).toEqual(byId(source.getCurrentPageShapes()))
		expect(target.getShape(createShapeId('old'))).toBeUndefined()
		// Loading replaces history and fits the camera to the document.
		expect(target.getCanUndo()).toBe(false)
		expect(target.getViewportPageBounds().contains(target.getCurrentPageBounds()!)).toBe(true)
	})

	it('reports unreadable, non-tldraw and too-new files without throwing', async () => {
		const editor = makeEditor()
		const missing = await loadTldrFile(editor, join(dir, 'missing.tldr'))
		expect(missing.ok).toBe(false)
		if (!missing.ok) expect(missing.error).toMatch(/^Could not read .*missing\.tldr/)

		expect(loadTldrJson(editor, 'not json at all')).toEqual({
			ok: false,
			error: 'Not a tldraw file',
		})
		expect(loadTldrJson(editor, JSON.stringify({ some: 'object' }))).toEqual({
			ok: false,
			error: 'Not a tldraw file',
		})

		const json = JSON.parse(await serializeTldrawJson(editor)) as {
			tldrawFileFormatVersion: number
		}
		json.tldrawFileFormatVersion = 999
		expect(loadTldrJson(editor, JSON.stringify(json))).toEqual({
			ok: false,
			error: 'File format version 999 is newer than this app supports',
		})
		expect(describeParseError({ type: 'v1File', data: null })).toMatch(/v1 file/)
		expect(describeParseError({ type: 'invalidRecords', cause: null })).toBe(
			'The file contains invalid records'
		)
	})

	it('watchDocumentChanges fires for user document changes only', async () => {
		const editor = makeEditor()
		let changes = 0
		const stop = watchDocumentChanges(editor, () => changes++)
		const settle = () => new Promise((resolve) => setTimeout(resolve, 40))

		editor.createShape({ id: createShapeId('w'), type: 'geo', x: 0, y: 0 })
		await settle()
		expect(changes).toBe(1)

		editor.setCamera({ x: 10, y: 10, z: 1 }, { immediate: true })
		editor.select(createShapeId('w'))
		editor.updateInstanceState({ isGridMode: true })
		await settle()
		expect(changes).toBe(1)

		editor.updateShape({ id: createShapeId('w'), type: 'geo', x: 5 })
		await settle()
		expect(changes).toBe(2)

		stop()
		editor.deleteShape(createShapeId('w'))
		await settle()
		expect(changes).toBe(2)
	})
})

describe('preferences', () => {
	it('getPrefsPath honours XDG_CONFIG_HOME and falls back to ~/.config', () => {
		expect(getPrefsPath({ XDG_CONFIG_HOME: '/xdg/config' })).toBe(
			join('/xdg/config', 'tldraw-tui', 'prefs.json')
		)
		expect(getPrefsPath({ XDG_CONFIG_HOME: '' })).toBe(
			join(homedir(), '.config', 'tldraw-tui', 'prefs.json')
		)
		expect(getPrefsPath({})).toBe(join(homedir(), '.config', 'tldraw-tui', 'prefs.json'))
	})

	it('readPrefsSeed tolerates missing or corrupt files and keeps only string values', async () => {
		expect(await readPrefsSeed(join(dir, 'missing.json'))).toEqual({})
		const corrupt = join(dir, 'corrupt.json')
		await writeFile(corrupt, '{ not json', 'utf8')
		expect(await readPrefsSeed(corrupt)).toEqual({})
		const list = join(dir, 'list.json')
		await writeFile(list, '[1, 2]', 'utf8')
		expect(await readPrefsSeed(list)).toEqual({})
		const mixed = join(dir, 'mixed.json')
		await writeFile(
			mixed,
			JSON.stringify({ [USER_PREFS_STORAGE_KEY]: '{"a":1}', number: 5, nested: { x: 1 } }),
			'utf8'
		)
		expect(await readPrefsSeed(mixed)).toEqual({ [USER_PREFS_STORAGE_KEY]: '{"a":1}' })
	})

	it('persistPrefs writes the storage value as a seed readPrefsSeed reads back', async () => {
		const path = join(dir, 'prefs', 'prefs.json')
		const storage = {
			getItem: (key: string) => (key === USER_PREFS_STORAGE_KEY ? '{"x":1}' : null),
		}
		expect(await persistPrefs(storage, path)).toEqual({ ok: true })
		expect(await readPrefsSeed(path)).toEqual({ [USER_PREFS_STORAGE_KEY]: '{"x":1}' })
		expect(await readFile(path, 'utf8')).toMatch(/\n$/)

		// Nothing stored yet: no file is written and the call still succeeds.
		const untouched = join(dir, 'prefs', 'untouched.json')
		expect(await persistPrefs({ getItem: () => null }, untouched)).toEqual({ ok: true })
		await expect(stat(untouched)).rejects.toThrow()
	})

	it('captures the preferences tldraw wrote to localStorage for the editor', async () => {
		makeEditor('dark')
		const path = join(dir, 'prefs', 'real.json')
		expect(await persistPrefs(globalThis.localStorage, path)).toEqual({ ok: true })
		const seed = await readPrefsSeed(path)
		const stored = JSON.parse(seed[USER_PREFS_STORAGE_KEY]) as {
			user: { colorScheme: string; edgeScrollSpeed: number }
		}
		expect(stored.user.colorScheme).toBe('dark')
		expect(stored.user.edgeScrollSpeed).toBe(0)
	})
})

describe('export as text', () => {
	it('sizes the offscreen screen to the page bounds at the current zoom, plus padding', () => {
		const editor = makeEditor()
		expect(computeExportRequest(editor)).toBeNull()
		expect(exportText(editor, () => 'never')).toBe('')

		editor.createShape({
			id: createShapeId('r'),
			type: 'geo',
			x: 100,
			y: 100,
			props: { w: 200, h: 100 },
		})
		const request = computeExportRequest(editor)!
		expect(request.zoom).toBe(1)
		// 200 px = 25 cols, 100 px = 6.25 rows → 7, each plus one padding cell per side.
		expect(request.cols).toBe(27)
		expect(request.rows).toBe(9)
		expect(request.bounds).toEqual(
			new Box(100 - CELL_W, 100 - CELL_H, request.cols * CELL_W, request.rows * CELL_H)
		)
		// Selection export needs a selection.
		expect(computeExportRequest(editor, { selectionOnly: true })).toBeNull()
		editor.select(createShapeId('r'))
		expect(computeExportRequest(editor, { selectionOnly: true })?.cols).toBe(27)
	})

	it('reduces the zoom when the content would exceed the caps', () => {
		const editor = makeEditor()
		editor.createShape({
			id: createShapeId('r'),
			type: 'geo',
			x: 100,
			y: 100,
			props: { w: 200, h: 100 },
		})
		const request = computeExportRequest(editor, { maxCols: 12, maxRows: 6 })!
		// Inner 10 cols × 4 rows: zoom = min(1, 80 / 200, 64 / 100) = 0.4.
		expect(request.zoom).toBeCloseTo(0.4, 6)
		expect(request.cols).toBe(12)
		expect(request.rows).toBe(5)
	})

	it('hands the request to the renderer and writes its text with a trailing newline', async () => {
		const editor = makeEditor()
		editor.createShape({ id: createShapeId('r'), type: 'geo', x: 0, y: 0, props: { w: 80, h: 32 } })
		const seen: ExportTextRequest[] = []
		const render = (_editor: typeof editor, request: ExportTextRequest) => {
			seen.push(request)
			return `${request.cols}x${request.rows}`
		}
		expect(exportText(editor, render)).toBe('12x4')
		expect(seen).toHaveLength(1)

		const path = join(dir, 'export', 'page.txt')
		expect(await exportTextFile(editor, path, render, { padCells: 0 })).toEqual({ ok: true })
		expect(await readFile(path, 'utf8')).toBe('10x2\n')
	})
})
