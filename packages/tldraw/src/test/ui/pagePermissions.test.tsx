import { act, fireEvent, screen } from '@testing-library/react'
import { Editor, TLPermission, atom, createShapeId } from '@tldraw/editor'
import { useEffect } from 'react'
import { Tldraw } from '../../lib/Tldraw'
import { TLUiActionsContextType, useActions } from '../../lib/ui/context/actions'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

const ALL: TLPermission[] = [
	'tl:shape:create',
	'tl:shape:update',
	'tl:shape:delete',
	'tl:page:create',
	'tl:page:update',
	'tl:page:delete',
]
const granted = atom<TLPermission[]>('granted', ALL)
const grant = (...permissions: TLPermission[]) => act(() => granted.set(permissions))
const without = (...permissions: TLPermission[]) => ALL.filter((p) => !permissions.includes(p))

function ActionCapturer({ onCapture }: { onCapture(actions: TLUiActionsContextType): void }) {
	const actions = useActions()
	useEffect(() => {
		onCapture(actions)
	}, [actions, onCapture])
	return null
}

let editor: Editor
let actions: TLUiActionsContextType

beforeEach(async () => {
	// jsdom has no Element.scrollTo, which the page menu calls to reveal the current page.
	Element.prototype.scrollTo = vi.fn()
	granted.set(ALL)

	const result = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw onMount={onMount} isPermitted={(permission) => granted.get().includes(permission)}>
				<ActionCapturer onCapture={(a) => (actions = a)} />
			</Tldraw>
		),
		{ waitForPatterns: false }
	)
	editor = result.editor

	act(() => {
		editor.createPage({ name: 'Page 2' })
		editor.createPage({ name: 'Page 3' })
	})
})

afterEach(() => {
	editor?.dispose()
})

async function openPageMenu() {
	await act(async () => {
		fireEvent.click(screen.getByTestId('page-menu.button'))
	})
}

// Opens the "..." menu of the middle page, which has every item.
async function openPage2Submenu() {
	await openPageMenu()
	const trigger = screen.getAllByTestId('page-menu.item-submenu')[1]
	const press = () =>
		act(async () => {
			fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' })
		})
	await press()
	// A menu left open by the previous test makes the first press close it instead.
	if (screen.queryAllByRole('menuitem').length === 0) await press()
}

function getSubmenuItems() {
	return Object.fromEntries(
		screen.getAllByRole('menuitem').map((item) => [
			// labels render as their translation ids here
			item.textContent?.replace('page-menu.submenu.', ''),
			item.matches(':disabled, [data-disabled], [aria-disabled="true"]') ? 'disabled' : 'on',
		])
	)
}

const ALL_ON = {
	rename: 'on',
	'duplicate-page': 'on',
	'move-up': 'on',
	'move-down': 'on',
	delete: 'on',
}

describe('the new page button', () => {
	it('is disabled without tl:page:create, and follows the grant', async () => {
		await openPageMenu()
		const button = screen.getByTestId<HTMLButtonElement>('page-menu.create')
		expect(button.disabled).toBe(false)

		grant(...without('tl:page:create'))
		expect(button.disabled).toBe(true)

		grant(...ALL)
		expect(button.disabled).toBe(false)
	})
})

describe('the page submenu', () => {
	it('has everything on with every permission', async () => {
		await openPage2Submenu()
		expect(getSubmenuItems()).toEqual(ALL_ON)
	})

	it('disables rename and move without tl:page:update', async () => {
		grant(...without('tl:page:update'))
		await openPage2Submenu()
		expect(getSubmenuItems()).toEqual({
			...ALL_ON,
			rename: 'disabled',
			'move-up': 'disabled',
			'move-down': 'disabled',
		})
	})

	it('disables duplicate without tl:page:create', async () => {
		grant(...without('tl:page:create'))
		await openPage2Submenu()
		expect(getSubmenuItems()).toEqual({ ...ALL_ON, 'duplicate-page': 'disabled' })
	})

	it('disables delete without tl:page:delete', async () => {
		grant(...without('tl:page:delete'))
		await openPage2Submenu()
		expect(getSubmenuItems()).toEqual({ ...ALL_ON, delete: 'disabled' })
	})

	it('needs the shape permissions too when the page has shapes on it', async () => {
		const page2 = editor.getPages()[1]
		act(() => {
			editor.setCurrentPage(page2.id)
			editor.createShapes([{ id: createShapeId(), type: 'geo' }])
		})
		grant(...without('tl:shape:create', 'tl:shape:delete'))
		await openPage2Submenu()
		expect(getSubmenuItems()).toEqual({
			...ALL_ON,
			'duplicate-page': 'disabled',
			delete: 'disabled',
		})
	})
})

describe('renaming', () => {
	it('does not start on double click without tl:page:update', async () => {
		grant(...without('tl:page:update'))
		await openPageMenu()
		const row = document.querySelectorAll<HTMLElement>('.tlui-page-menu__item__button')[1]
		await act(async () => {
			fireEvent.doubleClick(row)
		})
		expect(document.querySelector('.tlui-page-menu__item input')).toBeNull()
	})
})

describe('actions that create a page', () => {
	it('change-page-next does not add a page past the last one without tl:page:create', () => {
		const pages = editor.getPages()
		act(() => {
			editor.setCurrentPage(pages[pages.length - 1].id)
			editor.createShapes([{ id: createShapeId(), type: 'geo' }])
		})
		grant(...without('tl:page:create'))

		act(() => {
			actions['change-page-next'].onSelect('unknown')
		})

		expect(editor.getPages().length).toBe(3)
	})

	it('move-to-new-page is disabled without tl:page:create', () => {
		const id = createShapeId()
		act(() => {
			editor.createShapes([{ id, type: 'geo' }])
			editor.select(id)
		})
		expect(actions['move-to-new-page'].isEnabled?.(editor)).toBe(true)

		grant(...without('tl:page:create'))
		expect(actions['move-to-new-page'].isEnabled?.(editor)).toBe(false)
	})
})
