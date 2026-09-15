import { act } from '@testing-library/react'
import { createShapeId } from '@tldraw/editor'
import { DrawShapeUtil } from '../lib/shapes/draw/DrawShapeUtil'
import { getDisplayValues } from '../lib/shapes/shared/getDisplayValues'
import { Tldraw } from '../lib/Tldraw'
import { createDrawSegments } from '../lib/utils/test-helpers'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

it('re-renders draw shape colors when color mode toggles', async () => {
	// The draw component passes useColorMode() into getDisplayValues explicitly; without
	// that, its colors would render stale after a light/dark toggle.
	const { editor, rendered } = await renderTldrawComponentWithEditor(
		(onMount) => <Tldraw onMount={onMount} />,
		{ waitForPatterns: false }
	)

	const drawId = createShapeId('draw')
	await act(async () => {
		editor.user.updateUserPreferences({ colorScheme: 'light' })
		editor.createShapes([
			{
				id: drawId,
				type: 'draw',
				x: 0,
				y: 0,
				props: {
					segments: createDrawSegments([
						[
							{ x: 0, y: 0, z: 0.5 },
							{ x: 100, y: 100, z: 0.5 },
						],
					]),
					isComplete: true,
				},
			},
		])
	})

	const util = editor.getShapeUtil('draw') as DrawShapeUtil
	const shape = editor.getShape(drawId)!
	const lightStroke = getDisplayValues(util, shape, 'light').strokeColor
	const darkStroke = getDisplayValues(util, shape, 'dark').strokeColor
	expect(lightStroke).not.toBe(darkStroke)

	const paintedColors = () =>
		Array.from(rendered.container.querySelectorAll('path')).map(
			(path) => path.getAttribute('fill') ?? path.getAttribute('stroke')
		)

	expect(paintedColors()).toContain(lightStroke)
	expect(paintedColors()).not.toContain(darkStroke)

	await act(async () => {
		editor.user.updateUserPreferences({ colorScheme: 'dark' })
	})

	expect(paintedColors()).toContain(darkStroke)
	expect(paintedColors()).not.toContain(lightStroke)
})
