import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createPluginOnMount, mergePluginComponents } from '../lib/TldrawPlugin'

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
