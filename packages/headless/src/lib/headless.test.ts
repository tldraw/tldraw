import { Editor, TLGeoShape, createShapeId } from '@tldraw/editor'
import { GeoShapeUtil } from 'tldraw'
import { afterEach, describe, expect, it } from 'vitest'
import { createHeadlessEditor } from './createHeadlessEditor'

// Fast-fail smoke tests for the factory itself. The exhaustive behavioral coverage —
// document API, text, history, persistence, sync, lifecycle — lives in ../test/.

const editors: Editor[] = []
function makeEditor(...args: Parameters<typeof createHeadlessEditor>) {
	const editor = createHeadlessEditor(...args)
	editors.push(editor)
	return editor
}

afterEach(() => {
	for (const editor of editors.splice(0)) editor.dispose()
})

describe('createHeadlessEditor', () => {
	it('runs in an environment with no DOM, and installs none', () => {
		expect(typeof globalThis.document).toBe('undefined')
		expect(typeof (globalThis as any).window).toBe('undefined')

		const editor = makeEditor()
		expect(editor).toBeInstanceOf(Editor)

		// The document shim is scoped to tldraw — creating an editor must not have leaked a DOM
		// onto globalThis, where it would change environment detection for the whole process.
		expect(typeof globalThis.document).toBe('undefined')
		expect(typeof (globalThis as any).window).toBe('undefined')
	})

	it('creates a real editor with the default setup', () => {
		const editor = makeEditor()
		expect(editor.getCurrentToolId()).toBe('select')
		expect(editor.getShapeUtil('geo')).toBeDefined()
		expect(editor.getShapeUtil('arrow')).toBeDefined()
		expect(editor.getViewportScreenBounds()).toMatchObject({ w: 1920, h: 1080 })
		// no phantom insets from the containerless environment
		expect(editor.getInstanceState().insets).toEqual([false, false, false, false])
	})

	it('replaces default shape utils by type, like the <Tldraw> component', () => {
		class CustomGeoShapeUtil extends GeoShapeUtil {
			static override type = 'geo' as const
		}
		const editor = makeEditor({ shapeUtils: [CustomGeoShapeUtil] })
		expect(editor.getShapeUtil('geo')).toBeInstanceOf(CustomGeoShapeUtil)
	})

	it('cleans up bindings when a bound shape is deleted (core editor side effect)', () => {
		// This cascade is registered by the Editor constructor itself, not by
		// registerDefaultSideEffects — it must hold in any headless editor regardless of setup.
		const editor = makeEditor()
		const a = createShapeId()
		const b = createShapeId()
		const arrow = createShapeId()
		editor.createShape<TLGeoShape>({ id: a, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
		editor.createShape<TLGeoShape>({ id: b, type: 'geo', x: 300, y: 0, props: { w: 100, h: 100 } })
		editor.createShape({ id: arrow, type: 'arrow', x: 0, y: 0 })
		editor.createBindings([
			{ type: 'arrow', fromId: arrow, toId: a, props: { terminal: 'start' } },
			{ type: 'arrow', fromId: arrow, toId: b, props: { terminal: 'end' } },
		])
		expect(editor.getBindingsFromShape(arrow, 'arrow')).toHaveLength(2)

		editor.deleteShape(b)
		expect(editor.getBindingsFromShape(arrow, 'arrow')).toHaveLength(1)
	})

	it("frameLoop: 'manual' really starts no tick loop", async () => {
		const editor = makeEditor({ frameLoop: 'manual' })
		let ticks = 0
		editor.on('tick', () => ticks++)

		// long enough for several frames of the 16ms fallback raf to have fired — this catches
		// the loop being started late (e.g. by a scheduled frame in the editor constructor), not
		// just at construction time
		await new Promise((resolve) => setTimeout(resolve, 100))
		expect(ticks).toBe(0)

		editor.emit('tick', 16)
		expect(ticks).toBe(1)
	})
})
