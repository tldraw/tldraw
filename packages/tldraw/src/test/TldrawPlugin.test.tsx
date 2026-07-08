import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Tldraw } from '../lib/Tldraw'
import { createPluginOnMount, mergePluginComponents, TldrawPlugin } from '../lib/TldrawPlugin'
import { renderTldrawComponent } from './testutils/renderTldrawComponent'

const A = () => <div data-testid="a" />
const B = () => <div data-testid="b" />
const U = () => <div data-testid="u" />

describe('mergePluginComponents', () => {
	it('stacks InFrontOfTheCanvas contributions in order, user last', () => {
		const merged = mergePluginComponents(
			[
				{ id: 'p1', components: { InFrontOfTheCanvas: A } },
				{ id: 'p2', components: { InFrontOfTheCanvas: B } },
			],
			{ InFrontOfTheCanvas: U }
		)

		const Stacked = merged.InFrontOfTheCanvas!
		const { getAllByTestId } = render(<Stacked />)
		const order = getAllByTestId(/^[abu]$/).map((el) => el.getAttribute('data-testid'))
		expect(order).toEqual(['a', 'b', 'u'])
	})

	it('stacks OnTheCanvas contributions in order, user last', () => {
		const merged = mergePluginComponents(
			[
				{ id: 'p1', components: { OnTheCanvas: A } },
				{ id: 'p2', components: { OnTheCanvas: B } },
			],
			{ OnTheCanvas: U }
		)

		const Stacked = merged.OnTheCanvas!
		const { getAllByTestId } = render(<Stacked />)
		const order = getAllByTestId(/^[abu]$/).map((el) => el.getAttribute('data-testid'))
		expect(order).toEqual(['a', 'b', 'u'])
	})

	it('user null hides a stacked slot entirely', () => {
		const merged = mergePluginComponents([{ id: 'p1', components: { InFrontOfTheCanvas: A } }], {
			InFrontOfTheCanvas: null,
		})
		expect(merged.InFrontOfTheCanvas).toBeNull()
	})

	it('user wins on non-stackable slots; plugin fills unset ones', () => {
		const merged = mergePluginComponents([{ id: 'p1', components: { Toolbar: A } }], {})
		expect(merged.Toolbar).toBe(A)
		const merged2 = mergePluginComponents([{ id: 'p1', components: { Toolbar: A } }], {
			Toolbar: U,
		})
		expect(merged2.Toolbar).toBe(U)
	})
})

describe('createPluginOnMount', () => {
	it('runs plugin onMounts before the user onMount and chains cleanups', () => {
		const order: string[] = []
		const cleanup1 = vi.fn()
		const onMount = createPluginOnMount(
			[{ id: 'p1', onMount: () => (order.push('p1'), cleanup1) }],
			() => void order.push('user')
		)
		const cleanup = onMount({} as any)
		expect(order).toEqual(['p1', 'user'])
		;(cleanup as () => void)()
		expect(cleanup1).toHaveBeenCalledOnce()
	})
})

describe('<Tldraw plugins />', () => {
	// A plugin's `InFrontOfTheCanvas` overlay is host-installed content, analogous to a
	// user-supplied `InFrontOfTheCanvas`. It renders even when `hideUi` hides tldraw's own
	// chrome — `hideUi` only suppresses the default UI, not installed content.
	it('renders plugin InFrontOfTheCanvas content but no default UI when hideUi is set', async () => {
		const plugin: TldrawPlugin = {
			id: 'overlay-plugin',
			components: { InFrontOfTheCanvas: A },
		}

		await renderTldrawComponent(<Tldraw hideUi plugins={[plugin]} />, { waitForPatterns: false })

		// The plugin's overlay is installed content, so it renders even under hideUi.
		expect(document.querySelector('[data-testid="a"]')).toBeTruthy()
		// tldraw's own default UI chrome does not render.
		expect(document.querySelector('.tlui-layout')).toBeNull()
	})

	it('throws when two plugins share an id', async () => {
		const plugins: TldrawPlugin[] = [{ id: 'dup' }, { id: 'dup' }]

		expect(() => render(<Tldraw plugins={plugins} />)).toThrow(/duplicate plugin id/i)
	})
})
