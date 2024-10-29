import { act, render, RenderResult } from '@testing-library/react'
import { Atom } from '@tldraw/state'
import { useAtom } from './useAtom'
import { useValue } from './useValue'

test('useAtom returns an atom', async () => {
	let theAtom: null | Atom<any> = null as any
	function Component() {
		const a = useAtom('myAtom', 'a')
		theAtom = a
		return <>{useValue(a)}</>
	}

	let view: RenderResult
	await act(() => {
		view = render(<Component />)
	})

	expect(theAtom).not.toBeNull()
	expect(theAtom?.get()).toBe('a')
	expect(theAtom?.name).toBe('useAtom(myAtom)')
	expect(view!.asFragment().textContent).toMatchInlineSnapshot(`"a"`)

	// it doesn't create a new atom on re-render
	const a = theAtom!
	await act(() => {
		theAtom?.set('b')
	})
	expect(a).toBe(theAtom)
	expect(view!.asFragment().textContent).toMatchInlineSnapshot(`"b"`)
})

test('useAtom supports taking an initializer', async () => {
	let theAtom: null | Atom<any> = null as any
	function Component() {
		const a = useAtom('myAtom', () => 'a')
		theAtom = a
		return <>{useValue(a)}</>
	}

	let view: RenderResult
	await act(() => {
		view = render(<Component />)
	})

	expect(theAtom).not.toBeNull()
	expect(theAtom?.get()).toBe('a')

	expect(theAtom?.name).toBe('useAtom(myAtom)')
	expect(view!.asFragment().textContent).toMatchInlineSnapshot(`"a"`)
})
