import { act, fireEvent, screen } from '@testing-library/react'
import { Editor } from '@tldraw/editor'
import { Tldraw } from '../../lib/Tldraw'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

let editor: Editor

beforeEach(async () => {
	// jsdom has no Element.scrollTo, which the page menu calls to reveal the current page.
	Element.prototype.scrollTo = vi.fn()

	const result = await renderTldrawComponentWithEditor((onMount) => <Tldraw onMount={onMount} />, {
		waitForPatterns: false,
	})
	editor = result.editor

	act(() => {
		for (let i = 2; i <= 5; i++) {
			editor.createPage({ name: `Page ${i}` })
		}
	})
})

afterEach(() => {
	editor?.dispose()
})

const ORIGINAL_ORDER = ['Page 1', 'Page 2', 'Page 3', 'Page 4', 'Page 5']
const RESTING_OFFSETS = [0, 36, 72, 108, 144]

// jsdom's default pointerType is '', which tldraw treats as a coarse pointer, and the page menu
// only lets fine pointers drag rows directly.
const MOUSE = { pointerId: 1, pointerType: 'mouse' }

function getPageNames() {
	return editor.getPages().map((p) => p.name)
}

function getListContent() {
	return document.querySelector('.tlui-page-menu__list__content')
}

// Each row's vertical offset, in page order.
function getRowOffsets() {
	return editor.getPages().map((p) => {
		const row = document.querySelector<HTMLElement>(`[data-pageid="${p.id}"]`)!
		return Number(row.style.transform.match(/translateY\((-?[\d.]+)px\)/)![1])
	})
}

function getRowButton(name: string) {
	const page = editor.getPages().find((p) => p.name === name)!
	return document.querySelector<HTMLElement>(
		`[data-pageid="${page.id}"] .tlui-page-menu__item__button`
	)!
}

async function openPageMenu() {
	await act(async () => {
		fireEvent.click(screen.getByTestId('page-menu.button'))
	})
	expect(getListContent()).not.toBeNull()
}

// Rows are 36px tall, so a 72px drag carries "Page 2" down two rows, over "Page 4".
function dragPage2DownTwoRows() {
	const button = getRowButton('Page 2')
	fireEvent.pointerDown(button, { ...MOUSE, button: 0, clientY: 100 })
	fireEvent.pointerMove(button, { ...MOUSE, clientY: 172 })
	expect(getListContent()?.getAttribute('data-dragging')).toBe('true')
	expect(getRowOffsets()).toEqual([0, 108, 36, 72, 144])
	return button
}

describe('pressing Escape while drag-reordering pages (#11112)', () => {
	it('cancels only the drag and keeps the menu open', async () => {
		await openPageMenu()
		const button = dragPage2DownTwoRows()

		fireEvent.keyDown(button, { key: 'Escape' })

		expect(getListContent()).not.toBeNull()
		expect(getListContent()?.getAttribute('data-dragging')).toBe('false')
		expect(getRowOffsets()).toEqual(RESTING_OFFSETS)

		// The row still holds pointer capture, so the release lands on it.
		fireEvent.pointerUp(button, { ...MOUSE, clientY: 172 })
		fireEvent.click(button)

		expect(getPageNames()).toEqual(ORIGINAL_ORDER)
		expect(editor.getCurrentPage().name).toBe('Page 1')
		expect(getListContent()).not.toBeNull()

		// With no drag in progress, Escape closes the menu as usual.
		fireEvent.keyDown(button, { key: 'Escape' })
		expect(getListContent()).toBeNull()
	})

	it('cancels only the drag when the body has focus', async () => {
		await openPageMenu()
		const button = dragPage2DownTwoRows()
		;(document.activeElement as HTMLElement | null)?.blur()
		expect(document.activeElement).toBe(document.body)

		fireEvent.keyDown(document.body, { key: 'Escape' })

		expect(getListContent()).not.toBeNull()
		expect(getRowOffsets()).toEqual(RESTING_OFFSETS)

		fireEvent.pointerUp(button, { ...MOUSE, clientY: 172 })
		expect(getPageNames()).toEqual(ORIGINAL_ORDER)
	})

	it('still lets the next click switch pages when the release lands on another row', async () => {
		await openPageMenu()
		const button = dragPage2DownTwoRows()
		fireEvent.keyDown(button, { key: 'Escape' })
		// No click follows a release over a different row.
		fireEvent.pointerUp(button, { ...MOUSE, clientY: 172 })

		const page5Button = getRowButton('Page 5')
		fireEvent.pointerDown(page5Button, { ...MOUSE, button: 0, clientY: 250 })
		fireEvent.pointerUp(page5Button, { ...MOUSE, clientY: 250 })
		fireEvent.click(page5Button)

		expect(editor.getCurrentPage().name).toBe('Page 5')
		expect(getPageNames()).toEqual(ORIGINAL_ORDER)
	})

	it('closes the menu when the row is pressed but not yet dragged', async () => {
		await openPageMenu()
		const button = getRowButton('Page 2')
		fireEvent.pointerDown(button, { ...MOUSE, button: 0, clientY: 100 })
		// Safari doesn't focus buttons on click, so the row may not see the key.
		;(document.activeElement as HTMLElement | null)?.blur()

		fireEvent.keyDown(document.body, { key: 'Escape' })
		expect(getListContent()).toBeNull()

		// Hovering after reopening must not turn the abandoned press into a drag.
		await openPageMenu()
		fireEvent.pointerMove(getRowButton('Page 2'), { ...MOUSE, clientY: 250 })
		expect(getListContent()?.getAttribute('data-dragging')).toBe('false')
		expect(getRowOffsets()).toEqual(RESTING_OFFSETS)
	})
})

it('does not leave a drag behind when the menu closes mid-drag', async () => {
	await openPageMenu()
	dragPage2DownTwoRows()

	act(() => {
		editor.menus.clearOpenMenus()
	})
	expect(getListContent()).toBeNull()

	await openPageMenu()
	expect(getListContent()?.getAttribute('data-dragging')).toBe('false')
	expect(getRowOffsets()).toEqual(RESTING_OFFSETS)

	// Hovering with no button held must not pick the row back up.
	fireEvent.pointerMove(getRowButton('Page 2'), { ...MOUSE, clientY: 250 })
	expect(getListContent()?.getAttribute('data-dragging')).toBe('false')
	expect(getPageNames()).toEqual(ORIGINAL_ORDER)
})
