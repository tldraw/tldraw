import {
	Editor,
	TLAssetId,
	TLGeoShape,
	TLShapeId,
	createShapeId,
	getSnapshot,
	loadSnapshot,
} from '@tldraw/editor'
import { b64Vecs, toRichText } from '@tldraw/tlschema'
import { parseTldrawJsonFile, serializeTldrawJson } from 'tldraw/headless-defaults'
import { afterEach, describe, expect, it } from 'vitest'
import { createHeadlessEditor } from '../lib/createHeadlessEditor'

const editors: Editor[] = []
function makeEditor(opts: Parameters<typeof createHeadlessEditor>[0] = {}) {
	const editor = createHeadlessEditor({ frameLoop: 'manual', ...opts })
	editors.push(editor)
	return editor
}

afterEach(() => {
	for (const editor of editors.splice(0)) editor.dispose()
})

/**
 * Builds a document exercising every default shape family plus arrow bindings and assets:
 * geo, text, note, line, draw, highlight, a frame with a child, an arrow bound at both ends,
 * and image/bookmark shapes referencing asset records.
 */
function buildRichDocument(editor: Editor) {
	const ids = {
		geoA: createShapeId(),
		geoB: createShapeId(),
		text: createShapeId(),
		note: createShapeId(),
		line: createShapeId(),
		draw: createShapeId(),
		highlight: createShapeId(),
		frame: createShapeId(),
		frameChild: createShapeId(),
		arrow: createShapeId(),
		image: createShapeId(),
		bookmark: createShapeId(),
	}
	const assetIds = {
		image: 'asset:image1' as TLAssetId,
		bookmark: 'asset:bookmark1' as TLAssetId,
	}
	editor.createAssets([
		{
			id: assetIds.image,
			typeName: 'asset',
			type: 'image',
			props: {
				src: 'data:image/png;base64,AAAA',
				w: 10,
				h: 10,
				name: 'x.png',
				isAnimated: false,
				mimeType: 'image/png',
				fileSize: 4,
			},
			meta: {},
		},
		{
			id: assetIds.bookmark,
			typeName: 'asset',
			type: 'bookmark',
			props: {
				src: 'https://example.com',
				description: 'desc',
				image: '',
				favicon: '',
				title: 'title',
			},
			meta: {},
		},
	])
	editor.createShapes([
		{ id: ids.geoA, type: 'geo', x: 0, y: 0, props: { w: 100, h: 80 } },
		{ id: ids.geoB, type: 'geo', x: 400, y: 0, props: { w: 100, h: 80 } },
		{ id: ids.text, type: 'text', x: 0, y: 200, props: { richText: toRichText('hello\nworld') } },
		{ id: ids.note, type: 'note', x: 200, y: 200, props: { richText: toRichText('note') } },
		{ id: ids.line, type: 'line', x: 0, y: 400 },
		{
			id: ids.draw,
			type: 'draw',
			x: 100,
			y: 400,
			props: {
				// Draw segments store delta-encoded base64 path data, not raw points.
				segments: [
					{
						type: 'free',
						path: b64Vecs.encodePoints([
							{ x: 0, y: 0, z: 0.5 },
							{ x: 50, y: 25, z: 0.5 },
						]),
					},
				],
			},
		},
		{
			id: ids.highlight,
			type: 'highlight',
			x: 200,
			y: 400,
			props: {
				segments: [
					{
						type: 'free',
						path: b64Vecs.encodePoints([
							{ x: 0, y: 0, z: 0.5 },
							{ x: 30, y: 30, z: 0.5 },
						]),
					},
				],
			},
		},
		{ id: ids.frame, type: 'frame', x: 0, y: 600, props: { w: 300, h: 200 } },
		{
			id: ids.image,
			type: 'image',
			x: 400,
			y: 400,
			props: { w: 10, h: 10, assetId: assetIds.image },
		},
		{
			id: ids.bookmark,
			type: 'bookmark',
			x: 400,
			y: 600,
			props: { url: 'https://example.com', assetId: assetIds.bookmark },
		},
		{ id: ids.arrow, type: 'arrow', x: 0, y: 0, props: { richText: toRichText('link') } },
	])
	editor.createShape({ id: ids.frameChild, type: 'geo', x: 20, y: 20, parentId: ids.frame })
	editor.createBindings([
		{ type: 'arrow', fromId: ids.arrow, toId: ids.geoA, props: { terminal: 'start' } },
		{ type: 'arrow', fromId: ids.arrow, toId: ids.geoB, props: { terminal: 'end' } },
	])
	return { ids, assetIds }
}

describe('getSnapshot / loadSnapshot', () => {
	// Not a serialization test — the snapshot object graph is shared in memory. What this
	// guards is load-time side effects mutating records; the real serialization round trip
	// is the .tldr suite below.
	it('loading a snapshot into a fresh editor does not mutate the document records', () => {
		const a = makeEditor()
		buildRichDocument(a)
		const snapA = getSnapshot(a.store)

		const b = makeEditor({ snapshot: snapA })
		expect(getSnapshot(b.store).document.store).toEqual(snapA.document.store)
	})

	it('captures session state: current page, per-page camera, selection', () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape<TLGeoShape>({ id, type: 'geo', x: 10, y: 10 })
		editor.select(id)
		editor.setCamera({ x: 111, y: 222, z: 2 })

		expect(getSnapshot(editor.store).session).toEqual({
			version: 0,
			currentPageId: 'page:page',
			exportBackground: true,
			isFocusMode: false,
			isDebugMode: false,
			isToolLocked: false,
			isGridMode: false,
			pageStates: [
				{
					pageId: 'page:page',
					camera: { x: 111, y: 222, z: 2 },
					selectedShapeIds: [id],
					focusedGroupId: null,
				},
			],
		})
	})

	// PINNED: an editor snapshot load does not preserve the target's session — the snapshot's
	// own selection and camera win.
	it('an editor snapshot overwrites the target selection and camera', () => {
		const a = makeEditor()
		const id = createShapeId()
		a.createShape<TLGeoShape>({ id, type: 'geo', x: 10, y: 10 })
		a.select(id)
		a.setCamera({ x: 111, y: 222, z: 2 })
		const snap = getSnapshot(a.store)

		const b = makeEditor()
		const preId = createShapeId()
		b.createShape<TLGeoShape>({ id: preId, type: 'geo', x: 0, y: 0 })
		b.select(preId)
		b.setCamera({ x: -5, y: -5, z: 0.5 })

		loadSnapshot(b.store, snap)
		expect(b.getSelectedShapeIds()).toEqual([id])
		expect(b.getCamera()).toMatchObject({ x: 111, y: 222, z: 2 })
	})

	// PINNED: loading replaces the document wholesale — no merge with existing content.
	it('loading replaces existing content rather than merging', () => {
		const a = makeEditor()
		const id = createShapeId()
		a.createShape<TLGeoShape>({ id, type: 'geo', x: 10, y: 10 })
		const snap = getSnapshot(a.store)

		const b = makeEditor()
		const preId = createShapeId()
		b.createShape<TLGeoShape>({ id: preId, type: 'geo', x: 0, y: 0 })
		loadSnapshot(b.store, snap)

		expect(b.getShape(preId)).toBeUndefined()
		expect([...b.getCurrentPageShapeIds()]).toEqual([id])
	})

	// PINNED: a bare store snapshot (no session) preserves the target editor's camera, and the
	// old selection ends up empty because the selected shapes no longer exist.
	it('a store snapshot load preserves the target camera and drops stale selection', () => {
		const a = makeEditor()
		const id = createShapeId()
		a.createShape<TLGeoShape>({ id, type: 'geo', x: 10, y: 10 })
		const snap = getSnapshot(a.store)

		const b = makeEditor()
		const preId = createShapeId()
		b.createShape<TLGeoShape>({ id: preId, type: 'geo', x: 0, y: 0 })
		b.select(preId)
		b.setCamera({ x: 77, y: 88, z: 1.5 })

		loadSnapshot(b.store, snap.document)
		expect(b.getCamera()).toMatchObject({ x: 77, y: 88, z: 1.5 })
		expect(b.getSelectedShapeIds()).toEqual([])
		expect(b.getShape(id)).toBeDefined()
	})

	it('accepts a store snapshot and an editor snapshot interchangeably', () => {
		const a = makeEditor()
		const id = createShapeId()
		a.createShape<TLGeoShape>({ id, type: 'geo', x: 42, y: 24, props: { w: 100, h: 50 } })
		const snap = getSnapshot(a.store)

		const fromEditorSnap = makeEditor({ snapshot: snap })
		const fromStoreSnap = makeEditor({ snapshot: snap.document })
		expect(fromEditorSnap.getShapePageBounds(id)).toEqual(fromStoreSnap.getShapePageBounds(id))
	})
})

describe('.tldr files', () => {
	it('round-trips every default shape type with bindings', async () => {
		const a = makeEditor()
		const { ids } = buildRichDocument(a)
		const json = await serializeTldrawJson(a)

		const result = parseTldrawJsonFile({ schema: a.store.schema, json })
		expect(result.ok).toBe(true)
		if (!result.ok) throw new Error('unreachable')

		try {
			const b = makeEditor({ snapshot: result.value.getStoreSnapshot() })
			for (const [name, id] of Object.entries(ids)) {
				expect(b.getShapePageBounds(id as TLShapeId), name).toEqual(
					a.getShapePageBounds(id as TLShapeId)
				)
			}
			expect(b.getBindingsFromShape(ids.arrow, 'arrow')).toEqual(
				a.getBindingsFromShape(ids.arrow, 'arrow')
			)
		} finally {
			// The parsed store isn't owned by any editor — dispose it even when an assertion fails
			result.value.dispose()
		}
	})

	it('serializes bookmark and data-url image assets as-is headlessly', async () => {
		const a = makeEditor()
		const { assetIds } = buildRichDocument(a)
		const file = JSON.parse(await serializeTldrawJson(a))

		const assets = file.records.filter((r: any) => r.typeName === 'asset')
		expect(assets.map((r: any) => r.id).sort()).toEqual([assetIds.bookmark, assetIds.image])
		expect(assets.find((r: any) => r.id === assetIds.image).props.src).toBe(
			'data:image/png;base64,AAAA'
		)
		expect(assets.find((r: any) => r.id === assetIds.bookmark).props.src).toBe(
			'https://example.com'
		)
	})

	it('prunes assets no shape references from the file', async () => {
		const a = makeEditor()
		a.createAssets([
			{
				id: 'asset:unused' as TLAssetId,
				typeName: 'asset',
				type: 'bookmark',
				props: { src: 'https://unused.com', description: '', image: '', favicon: '', title: '' },
				meta: {},
			},
		])
		const file = JSON.parse(await serializeTldrawJson(a))
		expect(file.records.filter((r: any) => r.typeName === 'asset')).toEqual([])
		// The asset is still in the live store — pruning happens only in the serialized file.
		expect(a.getAsset('asset:unused' as TLAssetId)).toBeDefined()
	})

	it('rejects truncated json as notATldrawFile', async () => {
		const a = makeEditor()
		const json = await serializeTldrawJson(a)
		const result = parseTldrawJsonFile({ schema: a.store.schema, json: json.slice(0, 100) })
		expect(result.ok).toBe(false)
		if (result.ok) throw new Error('unreachable')
		expect(result.error.type).toBe('notATldrawFile')
	})

	it('rejects a newer file format version as fileFormatVersionTooNew', async () => {
		const a = makeEditor()
		const file = JSON.parse(await serializeTldrawJson(a))
		const result = parseTldrawJsonFile({
			schema: a.store.schema,
			json: JSON.stringify({ ...file, tldrawFileFormatVersion: 100 }),
		})
		expect(result.ok).toBe(false)
		if (result.ok) throw new Error('unreachable')
		expect(result.error).toEqual({ type: 'fileFormatVersionTooNew', version: 100 })
	})

	// PINNED: version 0 fails the nonZeroInteger validator before the too-new check, so it
	// reports notATldrawFile rather than a version error.
	it('rejects file format version 0 as notATldrawFile', async () => {
		const a = makeEditor()
		const file = JSON.parse(await serializeTldrawJson(a))
		const result = parseTldrawJsonFile({
			schema: a.store.schema,
			json: JSON.stringify({ ...file, tldrawFileFormatVersion: 0 }),
		})
		expect(result.ok).toBe(false)
		if (result.ok) throw new Error('unreachable')
		expect(result.error.type).toBe('notATldrawFile')
	})

	it('detects legacy v1 files as the v1File error', () => {
		const a = makeEditor()
		const result = parseTldrawJsonFile({
			schema: a.store.schema,
			json: JSON.stringify({ document: { version: 15 }, assets: {} }),
		})
		expect(result.ok).toBe(false)
		if (result.ok) throw new Error('unreachable')
		expect(result.error.type).toBe('v1File')
	})
})

describe('cross-editor transfer', () => {
	it('a snapshot yields identical page bounds for every shape in a fresh editor', () => {
		const a = makeEditor()
		const { ids } = buildRichDocument(a)
		const b = makeEditor({ snapshot: getSnapshot(a.store) })

		for (const [name, id] of Object.entries(ids)) {
			expect(b.getShapePageBounds(id as TLShapeId), name).toEqual(
				a.getShapePageBounds(id as TLShapeId)
			)
		}
	})

	it('arrow bindings survive the transfer and keep working', () => {
		const a = makeEditor()
		const { ids } = buildRichDocument(a)
		const b = makeEditor({ snapshot: getSnapshot(a.store) })

		expect(b.getBindingsFromShape(ids.arrow, 'arrow')).toHaveLength(2)
		// The transferred bindings are live: deleting a bound shape removes its binding.
		b.deleteShape(ids.geoB)
		expect(b.getBindingsFromShape(ids.arrow, 'arrow')).toHaveLength(1)
	})

	// PINNED: loading a session that points at a missing page does not throw — the store's
	// ensureStoreIsUsable repair leaves the editor on an existing page.
	it('repairs a session whose currentPageId references a missing page', () => {
		const a = makeEditor()
		const id = createShapeId()
		a.createShape<TLGeoShape>({ id, type: 'geo', x: 0, y: 0 })
		const snap = getSnapshot(a.store)
		const broken = {
			...snap,
			session: { ...snap.session, currentPageId: 'page:doesnotexist' as any, pageStates: [] },
		}

		const b = makeEditor()
		loadSnapshot(b.store, broken)
		expect(b.getCurrentPageId()).toBe('page:page')
		expect(b.getShape(id)).toBeDefined()
	})
})

describe('store.listen scopes and sources', () => {
	function collect(editor: Editor) {
		const seen: { label: string; source: string; keys: string[] }[] = []
		const record = (label: string) => (entry: any) =>
			seen.push({
				label,
				source: entry.source,
				keys: [
					...Object.keys(entry.changes.added),
					...Object.keys(entry.changes.updated),
					...Object.keys(entry.changes.removed),
				],
			})
		editor.store.listen(record('document/user'), { scope: 'document', source: 'user' })
		editor.store.listen(record('session/user'), { scope: 'session', source: 'user' })
		editor.store.listen(record('all/all'), { scope: 'all', source: 'all' })
		editor.store.listen(record('all/remote'), { scope: 'all', source: 'remote' })
		return seen
	}

	// Note: entries arrive synchronously in these tests because the store's history flush runs
	// immediately under a test environment; outside tests it is batched to the next frame.
	it("createShape fires the document scope with source 'user'", () => {
		const editor = makeEditor()
		const seen = collect(editor)
		const id = createShapeId()
		editor.createShape<TLGeoShape>({ id, type: 'geo', x: 0, y: 0 })

		const doc = seen.filter((e) => e.label === 'document/user')
		expect(doc).toEqual([{ label: 'document/user', source: 'user', keys: [id] }])
		expect(seen.some((e) => e.label === 'all/remote')).toBe(false)
	})

	it('selection changes fire the session scope, not the document scope', () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape<TLGeoShape>({ id, type: 'geo', x: 0, y: 0 })
		const seen = collect(editor)
		editor.select(id)

		expect(seen.filter((e) => e.label === 'document/user')).toEqual([])
		const session = seen.filter((e) => e.label === 'session/user')
		expect(session).toEqual([
			{ label: 'session/user', source: 'user', keys: ['instance_page_state:page:page'] },
		])
	})

	// PINNED: setCamera updates the instance record alongside the camera record, and both are
	// session-scoped.
	it('camera changes fire the session scope with camera and instance records', () => {
		const editor = makeEditor()
		const seen = collect(editor)
		editor.setCamera({ x: 1, y: 2 })

		const session = seen.filter((e) => e.label === 'session/user')
		expect(session).toEqual([
			{
				label: 'session/user',
				source: 'user',
				keys: ['camera:page:page', 'instance:instance'],
			},
		])
		expect(seen.filter((e) => e.label === 'document/user')).toEqual([])
	})

	it("mergeRemoteChanges fires source 'remote' and skips 'user' listeners", () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape<TLGeoShape>({ id, type: 'geo', x: 0, y: 0 })
		const remote = { ...editor.getShape<TLGeoShape>(id)!, id: createShapeId(), x: 500 }

		const seen = collect(editor)
		editor.store.mergeRemoteChanges(() => {
			editor.store.put([remote])
		})

		expect(seen.filter((e) => e.label === 'document/user')).toEqual([])
		expect(seen.filter((e) => e.label === 'all/remote')).toEqual([
			{ label: 'all/remote', source: 'remote', keys: [remote.id] },
		])
		// The 'all' source listener sees the same entry labeled remote.
		expect(seen.filter((e) => e.label === 'all/all')).toEqual([
			{ label: 'all/all', source: 'remote', keys: [remote.id] },
		])
	})
})

describe('store.listen under the production frame schedule', () => {
	// The synchronous delivery pinned above only holds because NODE_ENV=test makes
	// throttleToNextFrame run its callback immediately. __FORCE_RAF_IN_TESTS__ is the escape
	// hatch in @tldraw/utils' throttle.ts that restores the production path, where the store's
	// history flush is deferred to the next animation frame (a 16ms unref'd timeout in Node).
	// This is what a real Node agent sees: listeners do NOT fire synchronously after a write.
	it('defers listener delivery to the next frame', async () => {
		const editor = makeEditor()
		const seen: string[][] = []
		editor.store.listen((entry) => seen.push(Object.keys(entry.changes.added)), {
			scope: 'document',
			source: 'user',
		})

		;(globalThis as any).__FORCE_RAF_IN_TESTS__ = true
		try {
			const id = createShapeId()
			editor.createShape<TLGeoShape>({ id, type: 'geo', x: 0, y: 0 })
			// the write itself is synchronous — reads see it immediately...
			expect(editor.getShape(id)).toBeDefined()
			// ...but the listener has not fired yet
			expect(seen).toEqual([])

			await new Promise((resolve) => setTimeout(resolve, 50))
			expect(seen).toEqual([[id]])
		} finally {
			delete (globalThis as any).__FORCE_RAF_IN_TESTS__
		}
	})
})

describe('shape meta', () => {
	const meta = { agentRunId: 'x', tags: [1, 2] }

	it('survives updateShape, which merges meta per key rather than replacing it', () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape<TLGeoShape>({ id, type: 'geo', x: 0, y: 0, meta })
		expect(editor.getShape(id)!.meta).toEqual(meta)

		// an update that omits meta keeps it
		editor.updateShape<TLGeoShape>({ id, type: 'geo', x: 50 })
		expect(editor.getShape(id)!.meta).toEqual(meta)

		// PINNED: a meta partial is merged key-by-key over the existing meta (like props) — it
		// does NOT replace the object, so there is no way to delete a meta key via updateShape.
		editor.updateShape<TLGeoShape>({ id, type: 'geo', meta: { other: true, agentRunId: 'y' } })
		expect(editor.getShape(id)!.meta).toEqual({ agentRunId: 'y', tags: [1, 2], other: true })
	})

	it('survives getSnapshot/loadSnapshot and the .tldr file round trip', async () => {
		const a = makeEditor()
		const id = createShapeId()
		a.createShape<TLGeoShape>({ id, type: 'geo', x: 0, y: 0, meta })

		const b = makeEditor({ snapshot: getSnapshot(a.store) })
		expect(b.getShape(id)!.meta).toEqual(meta)

		const json = await serializeTldrawJson(a)
		const result = parseTldrawJsonFile({ schema: a.store.schema, json })
		if (!result.ok) throw new Error('expected the file to parse')
		try {
			const c = makeEditor({ snapshot: result.value.getStoreSnapshot() })
			expect(c.getShape(id)!.meta).toEqual(meta)
		} finally {
			result.value.dispose()
		}
	})

	// PINNED: meta is validated as JSON — a non-JSON value like undefined is rejected at
	// write time, so bad agent metadata fails fast instead of corrupting the document.
	it('rejects non-JSON meta values at write time', () => {
		const editor = makeEditor()
		const id = createShapeId()
		expect(() =>
			editor.createShape<TLGeoShape>({
				id,
				type: 'geo',
				x: 0,
				y: 0,
				meta: { bad: undefined } as any,
			})
		).toThrow()
		expect(editor.getShape(id)).toBeUndefined()
	})
})

describe('multi-page snapshot', () => {
	it('restores per-page camera, selection, and the current page independently', () => {
		const a = makeEditor()
		const page1 = a.getCurrentPageId()
		a.createPage({ name: 'two' })
		a.createPage({ name: 'three' })
		const [, p2, p3] = a.getPages()
		const page2 = p2.id
		const page3 = p3.id

		const shapeIds = {
			[page1]: createShapeId(),
			[page2]: createShapeId(),
			[page3]: createShapeId(),
		}
		const cameras = {
			[page1]: { x: 10, y: 20, z: 1 },
			[page2]: { x: -30, y: 40, z: 2 },
			[page3]: { x: 500, y: -600, z: 0.5 },
		}
		for (const pageId of [page1, page2, page3]) {
			a.setCurrentPage(pageId)
			a.createShape<TLGeoShape>({ id: shapeIds[pageId], type: 'geo', x: 0, y: 0 })
			a.select(shapeIds[pageId])
			a.setCamera(cameras[pageId])
		}
		a.setCurrentPage(page2)

		const b = makeEditor({ snapshot: getSnapshot(a.store) })
		expect(b.getCurrentPageId()).toBe(page2)
		// visit each page: its own camera and selection come back, unaffected by the others
		for (const pageId of [page1, page2, page3]) {
			b.setCurrentPage(pageId)
			expect(b.getCamera(), pageId).toMatchObject(cameras[pageId])
			expect(b.getSelectedShapeIds(), pageId).toEqual([shapeIds[pageId]])
		}
	})
})

describe('arrow shape transfer detail', () => {
	it('a bound arrow reports the same page bounds in both editors', () => {
		const a = makeEditor()
		const geoA = createShapeId()
		const geoB = createShapeId()
		const arrow = createShapeId()
		a.createShapes([
			{ id: geoA, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: geoB, type: 'geo', x: 300, y: 200, props: { w: 100, h: 100 } },
			{ id: arrow, type: 'arrow', x: 0, y: 0 },
		])
		a.createBindings([
			{ type: 'arrow', fromId: arrow, toId: geoA, props: { terminal: 'start' } },
			{ type: 'arrow', fromId: arrow, toId: geoB, props: { terminal: 'end' } },
		])
		const boundsA = a.getShapePageBounds(arrow)!
		expect(boundsA.w).toBeGreaterThan(0)

		const b = makeEditor({ snapshot: getSnapshot(a.store) })
		expect(b.getShapePageBounds(arrow)).toEqual(boundsA)

		// Moving a bound shape in the receiving editor re-routes the arrow there too.
		b.updateShape<TLGeoShape>({ id: geoB, type: 'geo', x: 600 })
		expect(b.getShapePageBounds(arrow)!.w).toBeGreaterThan(boundsA.w)
	})
})
