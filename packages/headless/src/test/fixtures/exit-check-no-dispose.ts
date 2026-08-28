// Spawned by processExit.test.ts: like exit-check.ts, but deliberately never disposes the
// editor. Because every editor timer is unref'd, the process must still exit on its own — a
// forgotten dispose is a small CPU leak, never a hung process.
import { createHeadlessEditor } from '../../index'

const editor = createHeadlessEditor()
editor.createShape({ type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
if (editor.getCurrentPageShapes().length !== 1) {
	throw new Error('expected the shape to exist')
}
// Reading collaborators starts the visibility clock, a repeating editor interval — the
// exact timer that used to pin an undisposed process. It must be unref'd like the rest.
editor.getVisibleCollaborators()
// eslint-disable-next-line no-console
console.log('NO_DISPOSE_OK')
