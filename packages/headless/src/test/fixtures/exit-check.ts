// Spawned by processExit.test.ts: creates and uses a headless editor, disposes it, and prints a
// marker. The parent test asserts this process then exits on its own — the guard against any
// dependency (present or future) grabbing the Node event loop at import or editor-construction
// time.
import { createHeadlessEditor } from '../../index'

const editor = createHeadlessEditor()
editor.createShape({ type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
if (editor.getCurrentPageShapes().length !== 1) {
	throw new Error('expected the shape to exist')
}
editor.dispose()
// eslint-disable-next-line no-console
console.log('DISPOSED_OK')
