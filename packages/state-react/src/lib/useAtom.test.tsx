import { act, render } from '@testing-library/react'
import { Atom } from '@tldraw/state'
import { useAtom } from './useAtom'
import { useValue } from './useValue'

test('useAtom creates stable atom across re-renders', async () => {
	let theAtom: null | Atom<any> = null as any
	function Component() {
		const a = useAtom('myAtom', 'a')
		theAtom = a
		return <>{useValue(a)}</>
	}

	await act(() => {
		render(<Component />)
	})

	expect(theAtom).not.toBeNull()
	expect(theAtom?.get()).toBe('a')

	// it doesn't create a new atom on re-render
	const originalAtom = theAtom!
	await act(() => {
		theAtom?.set('b')
	})
	expect(originalAtom).toBe(theAtom)
	expect(theAtom?.get()).toBe('b')
})
