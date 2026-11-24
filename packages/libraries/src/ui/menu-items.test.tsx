import { DropdownMenu } from 'radix-ui'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { MenuTargetItems } from './menu-items'

declare global {
	var IS_REACT_ACT_ENVIRONMENT: boolean
}

let container: HTMLElement
let root: Root

beforeEach(() => {
	globalThis.IS_REACT_ACT_ENVIRONMENT = true
	container = document.createElement('div')
	document.body.append(container)
	root = createRoot(container)
})

afterEach(() => {
	act(() => root.unmount())
	container.remove()
})

it('lists targets as flat menu items, with any detail after the name', () => {
	act(() =>
		root.render(
			<DropdownMenu.Root open>
				<DropdownMenu.Trigger />
				<DropdownMenu.Content>
					<MenuTargetItems
						targets={[
							{ id: 'stash', name: 'My stash' },
							{ id: 'board', name: 'This board' },
							{ id: 'kit', name: 'Kit', detail: 'Team' },
						]}
						onSelect={() => {}}
					/>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		)
	)
	const menu = document.querySelector('[role="menu"]')!
	expect(menu.querySelector('[role="group"]')).toBeNull()
	const items = [...menu.querySelectorAll('[role="menuitem"]')]
	expect(items.map((item) => item.textContent)).toEqual(['My stash', 'This board', 'KitTeam'])
	expect(items[2].querySelector('.tlui-libraries-menu__item-detail')!.textContent).toBe('Team')
})
