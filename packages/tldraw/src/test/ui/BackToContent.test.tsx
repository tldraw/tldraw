import { act, screen, waitFor } from '@testing-library/react'
import { Box, Editor, Vec } from '@tldraw/editor'
import { Tldraw } from '../../lib/Tldraw'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

let editor: Editor

beforeEach(async () => {
	const result = await renderTldrawComponentWithEditor((onMount) => <Tldraw onMount={onMount} />, {
		waitForPatterns: false,
	})
	editor = result.editor

	// Set up a proper viewport so shapes can be on/off screen
	act(() => {
		editor.updateViewportScreenBounds(new Box(0, 0, 1000, 800))
	})
})

function createShapeInViewport() {
	act(() => {
		editor.createShape({
			type: 'geo',
			x: 100,
			y: 100,
			props: { w: 100, h: 100 },
		})
	})
}

function panAllShapesOffScreen() {
	// Move camera so all shapes are off-screen
	act(() => {
		const camera = editor.getCamera()
		editor.setCamera(new Vec(camera.x - 2000, camera.y - 2000, camera.z), { immediate: true })
	})
}

describe('BackToContent button', () => {
	it('shows when all shapes are off-screen', async () => {
		createShapeInViewport()

		// Initially, button should not be visible (shapes are on screen)
		await waitFor(() => {
			expect(screen.queryByTestId('helper-buttons.back-to-content')).toBeNull()
		})

		panAllShapesOffScreen()

		// Now the button should appear
		await waitFor(() => {
			expect(screen.queryByTestId('helper-buttons.back-to-content')).not.toBeNull()
		})
	})

	it('shows when selected shapes are off-screen', async () => {
		createShapeInViewport()

		await waitFor(() => {
			expect(editor.getCurrentPageShapeIds().size).toBe(1)
		})

		const shapeId = editor.getCurrentPageShapeIds().values().next().value!

		// Select the shape
		act(() => {
			editor.select(shapeId)
		})

		// Initially, button should not be visible
		await waitFor(() => {
			expect(screen.queryByTestId('helper-buttons.back-to-content')).toBeNull()
		})

		panAllShapesOffScreen()

		// Button should still appear even though selected shapes aren't culled
		await waitFor(() => {
			expect(screen.queryByTestId('helper-buttons.back-to-content')).not.toBeNull()
		})
	})

	it('does not show when some shapes are still on-screen', async () => {
		// Create two shapes
		act(() => {
			editor.createShape({
				type: 'geo',
				x: 100,
				y: 100,
				props: { w: 100, h: 100 },
			})
			editor.createShape({
				type: 'geo',
				x: 500,
				y: 500,
				props: { w: 100, h: 100 },
			})
		})

		// Pan so only the first shape is off-screen
		act(() => {
			const camera = editor.getCamera()
			editor.setCamera(new Vec(camera.x - 300, camera.y - 300, camera.z), { immediate: true })
		})

		// Button should not appear since one shape is still visible
		await waitFor(() => {
			expect(screen.queryByTestId('helper-buttons.back-to-content')).toBeNull()
		})
	})
})
