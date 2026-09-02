import { act, screen, waitFor } from '@testing-library/react'
import { createShapeId } from '@tldraw/editor'
import { Tldraw } from '../../lib/Tldraw'
import { FrameSelectionMenuItem } from '../../lib/ui/components/menu-items'
import { TldrawUiMenuContextProvider } from '../../lib/ui/components/primitives/menus/TldrawUiMenuContext'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

// The keyboard-shortcuts menu context renders items without a Radix menu root, so the item's
// visibility gate can be asserted straight from its test id instead of opening a submenu.
async function setup() {
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw onMount={onMount}>
				<TldrawUiMenuContextProvider type="keyboard-shortcuts" sourceId="kbd">
					<FrameSelectionMenuItem />
				</TldrawUiMenuContextProvider>
			</Tldraw>
		),
		{ waitForPatterns: false }
	)

	const frameId = createShapeId()
	const a = createShapeId()
	const b = createShapeId()
	const locked = createShapeId()
	act(() => {
		editor.createShapes([
			{ id: frameId, type: 'frame', x: 0, y: 0, props: { w: 200, h: 200 } },
			{ id: a, type: 'geo', x: 300, y: 0 },
			{ id: b, type: 'geo', x: 500, y: 0 },
			{ id: locked, type: 'geo', x: 700, y: 0, isLocked: true },
		])
	})

	return { editor, frameId, a, b, locked }
}

const findItem = () => screen.findByTestId('kbd.frame-selection')
const expectNoItem = () =>
	waitFor(() => expect(screen.queryByTestId('kbd.frame-selection')).toBeNull())

describe('FrameSelectionMenuItem', () => {
	it('is hidden with nothing selected', async () => {
		await setup()
		await expectNoItem()
	})

	it('shows for a single selected shape', async () => {
		const { editor, a } = await setup()
		act(() => editor.select(a))
		await findItem()
	})

	it('shows for multiple selected shapes', async () => {
		const { editor, a, b } = await setup()
		act(() => editor.select(a, b))
		await findItem()
	})

	it('is hidden when every selected shape is a frame, since the action would unframe instead', async () => {
		const { editor, frameId, a } = await setup()
		act(() => editor.select(a))
		await findItem()

		act(() => editor.select(frameId))
		await expectNoItem()
	})

	it('shows for a frame selected together with another shape', async () => {
		const { editor, frameId, a } = await setup()
		act(() => editor.select(frameId, a))
		await findItem()
	})

	it('is hidden when nothing in the selection can be framed', async () => {
		const { editor, locked, a } = await setup()
		act(() => editor.select(a))
		await findItem()

		act(() => editor.select(locked))
		await expectNoItem()
	})

	it('shows for a locked shape selected together with a frameable one', async () => {
		const { editor, locked, a } = await setup()
		act(() => editor.select(locked, a))
		await findItem()
	})
})
