import { render, RenderResult } from '@testing-library/react'
import { ReactElement } from 'react'
import { Editor, promiseWithResolve } from 'tldraw'

// A copy of packages/tldraw/src/test/testutils/renderTldrawComponent.tsx, which isn't exported.

/**
 * Render a <Tldraw /> component and wait for its canvas, and with `waitForPatterns` its fill
 * patterns, to be ready.
 */
export async function renderTldrawComponent(
	element: ReactElement,
	{ waitForPatterns }: { waitForPatterns: boolean }
): Promise<RenderResult> {
	const result = render(element)
	await result.findAllByTestId('canvas')
	if (waitForPatterns) await result.findByTestId('ready-pattern-fill-defs')
	return result
}

export async function renderTldrawComponentWithEditor(
	cb: (onMount: (editor: Editor) => void) => ReactElement,
	opts: { waitForPatterns: boolean }
): Promise<{ editor: Editor; rendered: RenderResult }> {
	const editorPromise = promiseWithResolve<Editor>()
	const element = cb((editor) => {
		editorPromise.resolve(editor)
	})
	const rendered = await renderTldrawComponent(element, opts)
	const editor = await editorPromise
	return { editor, rendered }
}
