import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { TldrawUiTooltipProvider } from 'tldraw'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { ItemTile } from './item-tile'

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

const renderTile = (thumbnailUrl?: string) =>
	act(() => root.render(<ItemTile accessibleLabel="Star" thumbnailUrl={thumbnailUrl} />))

const images = () =>
	[...container.querySelectorAll('img')].map((img) => ({
		src: img.getAttribute('src'),
		loading: img.hasAttribute('data-loading'),
	}))

const load = (src: string) =>
	act(() => {
		container.querySelector(`img[src="${src}"]`)!.dispatchEvent(new Event('load'))
	})

it('shows the first image while it loads', () => {
	renderTile('blob:preview')
	expect(images()).toEqual([{ src: 'blob:preview', loading: false }])
})

it('keeps showing the loaded image until the next URL’s image has loaded', () => {
	renderTile('blob:preview')
	load('blob:preview')
	renderTile('https://uploads.example/star')
	expect(images()).toEqual([
		{ src: 'blob:preview', loading: false },
		{ src: 'https://uploads.example/star', loading: true },
	])

	load('https://uploads.example/star')
	expect(images()).toEqual([{ src: 'https://uploads.example/star', loading: false }])
})

it('shows no image once the item has no thumbnail', () => {
	renderTile('blob:preview')
	load('blob:preview')
	renderTile(undefined)
	expect(images()).toEqual([])
})

const placeholder = () => container.querySelector('.tlui-libraries-tile__placeholder')

it('shows the item’s name in place of a thumbnail', () => {
	act(() =>
		root.render(
			<TldrawUiTooltipProvider>
				<ItemTile name="Star" accessibleLabel="Star" />
			</TldrawUiTooltipProvider>
		)
	)
	expect(placeholder()?.textContent).toBe('Star')
})

it('shows an icon in place of an unnamed item’s thumbnail', () => {
	act(() => root.render(<ItemTile accessibleLabel="Unnamed item" />))
	expect(placeholder()?.querySelector('.tlui-icon')).not.toBeNull()
})

it('shows no placeholder once the item has a thumbnail', () => {
	renderTile('blob:preview')
	expect(placeholder()).toBeNull()
})
