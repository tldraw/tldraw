import { act, render, RenderResult } from '@testing-library/react'
import { Atom, Computed } from '@tldraw/state'
import { vi } from 'vitest'
import { useAtom } from './useAtom'
import { useComputed } from './useComputed'
import { useValue } from './useValue'

test('useComputed returns a computed value', async () => {
	let theComputed = null as null | Computed<number>
	let theAtom = null as null | Atom<number>
	function Component() {
		const a = useAtom('a', 1)
		theAtom = a
		const b = useComputed('a+1', () => a.get() + 1, [])
		theComputed = b
		return <>{useValue(b)}</>
	}

	let view: RenderResult
	await act(() => {
		view = render(<Component />)
	})

	expect(theComputed).not.toBeNull()
	expect(theComputed?.get()).toBe(2)
	expect(theComputed?.name).toBe('useComputed(a+1)')
	expect(view!.asFragment().textContent).toMatchInlineSnapshot(`"2"`)

	await act(() => {
		theAtom?.set(5)
	})
	expect(view!.asFragment().textContent).toMatchInlineSnapshot(`"6"`)
})

test('useComputed allows optionally passing options', async () => {
	let theComputed = null as null | Computed<number>
	let theAtom = null as null | Atom<number>
	const isEqual = vi.fn((a, b) => a === b)
	function Component() {
		const a = useAtom('a', 1)
		theAtom = a
		const b = useComputed('a+1', () => a.get() + 1, { isEqual }, [])
		theComputed = b
		return <>{useValue(b)}</>
	}

	let view: RenderResult
	await act(() => {
		view = render(<Component />)
	})

	expect(theComputed).not.toBeNull()
	expect(theComputed?.get()).toBe(2)
	expect(theComputed?.name).toBe('useComputed(a+1)')
	expect(view!.asFragment().textContent).toMatchInlineSnapshot(`"2"`)

	await act(() => {
		theAtom?.set(5)
	})
	expect(view!.asFragment().textContent).toMatchInlineSnapshot(`"6"`)

	expect(isEqual).toHaveBeenCalled()
})
