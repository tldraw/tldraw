import { act, fireEvent, screen } from '@testing-library/react'
import { Editor, TLPageId } from '@tldraw/editor'
import { Tldraw } from '../../lib/Tldraw'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

let editor: Editor
let protectedPage: TLPageId | null = null

beforeEach(async () => {
	// jsdom has no Element.scrollTo, which the page menu calls to reveal the current page.
	Element.prototype.scrollTo = vi.fn()
	protectedPage = null
	const result = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw
				onMount={onMount}
				isChangePermitted={(change) => (change.next ?? change.prev).id !== protectedPage}
			/>
		),
		{ waitForPatterns: false }
	)
	editor = result.editor
	act(() => {
		for (let i = 2; i <= 4; i++) editor.createPage({ name: `Page ${i}` })
	})
	protectedPage = editor.getPages()[1].id
})

afterEach(() => {
	editor?.dispose()
})

const MOUSE = { pointerId: 1, pointerType: 'mouse' }
const names = () => editor.getPages().map((p) => p.name)
const rowButton = (name: string) => {
	const page = editor.getPages().find((p) => p.name === name)!
	return document.querySelector<HTMLElement>(
		`[data-pageid="${page.id}"] .tlui-page-menu__item__button`
	)!
}

async function dragDownTwoRows(name: string) {
	await act(async () => {
		fireEvent.click(screen.getByTestId('page-menu.button'))
	})
	const button = rowButton(name)
	fireEvent.pointerDown(button, { ...MOUSE, button: 0, clientY: 100 })
	fireEvent.pointerMove(button, { ...MOUSE, clientY: 172 })
	const dragging =
		document.querySelector('.tlui-page-menu__list__content')?.getAttribute('data-dragging') ===
		'true'
	fireEvent.pointerUp(button, { ...MOUSE, button: 0, clientY: 172 })
	return dragging
}

it("doesn't drag a page the user can't change", async () => {
	expect(await dragDownTwoRows('Page 2')).toBe(false)
	expect(names()).toEqual(['Page 1', 'Page 2', 'Page 3', 'Page 4'])
})

it('still drags a page the user can change', async () => {
	expect(await dragDownTwoRows('Page 3')).toBe(true)
	expect(names()).not.toEqual(['Page 1', 'Page 2', 'Page 3', 'Page 4'])
})
