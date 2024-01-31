import { render } from '@testing-library/react'
import { ReactElement } from 'react'

/**
 * Render a <Tldraw /> component and wait for it to become ready. By default, this includes waiting
 * for the canvas and fill patterns to pre-render.
 *
 * You almost always want to wait for the canvas, but if you are testing a component that passes its
 * own children and doesn't render the canvas itself, you can set `waitForCanvas` to false.
 *
 * Without waiting for patterns, a bunch of "missing `act()`" errors will fill the console, but if
 * you don't need it (or your're testing the tldraw component without our default shapes, and so
 * don't have pre-rendered patterns to worry about) you can set `waitForPatterns` to false.
 */
export async function renderTldrawComponent(
	element: ReactElement,
	{ waitForPatterns = true } = {}
) {
	const result = render(element)
	if (waitForPatterns) await result.findByTestId('ready-pattern-fill-defs')
	return result
}
