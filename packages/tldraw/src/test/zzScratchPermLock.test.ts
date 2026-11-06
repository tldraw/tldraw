import { atom, createShapeId, PageRecordType, TLShape } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

const lockedIds = atom('locked', new Set<string>())
const roPages = atom('ro', new Set<string>())
let editor: TestEditor

beforeEach(() => {
	lockedIds.set(new Set())
	roPages.set(new Set())
	editor = new TestEditor({
		isShapeLocked: (s: TLShape) => lockedIds.get().has(s.id),
		isPageReadonly: (p) => roPages.get().has(p.id),
	})
})

const A = createShapeId('a')
const F = createShapeId('f')

it('B: unlock partial on a shape that is isLocked AND option-locked passes updateShapes', () => {
	editor.createShape({ id: A, type: 'geo', x: 0, y: 0, isLocked: true })
	lockedIds.set(new Set([A]))
	expect(editor.isShapeLocked(A)).toBe(true)
	editor.updateShapes([{ id: A, type: 'geo', isLocked: false, x: 500 }])
	const s = editor.getShape(A)!
	;(globalThis as any).process.stderr.write("\n@@ " + JSON.stringify(['B result', s.isLocked, s.x]) + "\n")
})

it('B2: toggleLock / unlock-all on option-locked + isLocked shape', () => {
	editor.createShape({ id: A, type: 'geo', x: 0, y: 0, isLocked: true })
	lockedIds.set(new Set([A]))
	editor.toggleLock([A])
	;(globalThis as any).process.stderr.write("\n@@ " + JSON.stringify(['B2 toggleLock result isLocked', editor.getShape(A)!.isLocked]) + "\n")
})

it('C: drawing a geo inside an option-locked frame does not parent to the frame', () => {
	editor.createShape({ id: F, type: 'frame', x: 0, y: 0, props: { w: 400, h: 400 } })
	lockedIds.set(new Set([F]))
	editor.setCurrentTool('geo')
	editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp()
	const created = editor.getCurrentPageShapes().find((s) => s.type === 'geo')!
	;(globalThis as any).process.stderr.write("\n@@ " + JSON.stringify(['C parent', created.parentId]) + "\n")
})

it('A: geo tool active when the page becomes read-only', () => {
	editor.setCurrentTool('geo')
	roPages.set(new Set([editor.getCurrentPageId()]))
	expect(editor.getIsReadonly()).toBe(true)
	let err: any
	try {
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp()
	} catch (e) {
		err = e
	}
	;(globalThis as any).process.stderr.write("\n@@ " + JSON.stringify(['A error', err?.message, editor.getPath()]) + "\n")
})

it('A2: other tools on read-only page', () => {
	for (const tool of ['note', 'text', 'arrow', 'line', 'frame', 'draw', 'highlight']) {
		editor.setCurrentTool('select')
		roPages.set(new Set())
		editor.setCurrentTool(tool)
		roPages.set(new Set([editor.getCurrentPageId()]))
		let err: any
		try {
			editor.pointerDown(100, 100).pointerMove(200, 220).pointerMove(250, 260).pointerUp()
			editor.click(300, 300)
		} catch (e) {
			err = e
		}
		;(globalThis as any).process.stderr.write("\n@@ " + JSON.stringify(['A2', tool, err?.message, editor.getPath()]) + "\n")
		roPages.set(new Set())
		editor.cancel().cancel()
	}
})

it('D: moveShapesToPage onto a read-only page', () => {
	const p2 = PageRecordType.createId('p2')
	editor.createPage({ id: p2, name: 'p2' })
	editor.createShape({ id: A, type: 'geo', x: 0, y: 0 })
	roPages.set(new Set([p2]))
	let err: any
	try { editor.moveShapesToPage([A], p2) } catch (e) { err = e }
	;(globalThis as any).process.stderr.write('\n@@ D ' + JSON.stringify([err?.message, !!editor.getShape(A), editor.getCurrentPageId()]) + '\n')
	return
	;(globalThis as any).process.stderr.write("\n@@ " + JSON.stringify(['D shape page', editor.getAncestorPageId(A), 'current', editor.getCurrentPageId()]) + "\n")
})

it('E: selected shape becomes option-locked stays selected; can it be nudged/rotated/styled?', () => {
	editor.createShape({ id: A, type: 'geo', x: 0, y: 0 })
	editor.select(A)
	lockedIds.set(new Set([A]))
	;(globalThis as any).process.stderr.write("\n@@ " + JSON.stringify(['E selected', editor.getSelectedShapeIds()]) + "\n")
	editor.nudgeShapes([A], { x: 10, y: 0 })
	;(globalThis as any).process.stderr.write("\n@@ " + JSON.stringify(['E x', editor.getShape(A)!.x]) + "\n")
})

it('F: editing text while page becomes readonly', () => {
	editor.createShape({ id: A, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
	editor.select(A)
	editor.setEditingShape(A)
	lockedIds.set(new Set([A]))
	;(globalThis as any).process.stderr.write("\n@@ " + JSON.stringify(['F editing after lock', editor.getEditingShapeId(), editor.getPath()]) + "\n")
})

it('G: reactivity of getIsReadonly when callback reads atom', () => {
	expect(editor.getIsReadonly()).toBe(false)
	roPages.set(new Set([editor.getCurrentPageId()]))
	expect(editor.getIsReadonly()).toBe(true)
})
