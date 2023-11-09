import ReactTestRenderer from 'react-test-renderer'
import { Atom } from '../core/Atom'
import { useAtom } from './useAtom'
import { useValue } from './useValue'

test('useAtom returns an atom', async () => {
	let theAtom: null | Atom<any> = null as any
	function Component() {
		const a = useAtom('myAtom', 'a')
		theAtom = a
		return <>{useValue(a)}</>
	}

	let view: ReactTestRenderer.ReactTestRenderer
	await ReactTestRenderer.act(() => {
		view = ReactTestRenderer.create(<Component />)
	})

	expect(theAtom).not.toBeNull()
	expect(theAtom?.get()).toBe('a')
	expect(theAtom?.name).toBe('useAtom(myAtom)')
	expect(view!.toJSON()).toMatchInlineSnapshot(`"a"`)

	// it doesn't create a new atom on re-render
	const a = theAtom!
	await ReactTestRenderer.act(() => {
		theAtom?.set('b')
	})
	expect(a).toBe(theAtom)
	expect(view!.toJSON()).toMatchInlineSnapshot(`"b"`)
})

test('useAtom supports taking an initializer', async () => {
	let theAtom: null | Atom<any> = null as any
	function Component() {
		const a = useAtom('myAtom', () => 'a')
		theAtom = a
		return <>{useValue(a)}</>
	}

	let view: ReactTestRenderer.ReactTestRenderer
	await ReactTestRenderer.act(() => {
		view = ReactTestRenderer.create(<Component />)
	})

	expect(theAtom).not.toBeNull()
	expect(theAtom?.get()).toBe('a')

	expect(theAtom?.name).toBe('useAtom(myAtom)')
	expect(view!.toJSON()).toMatchInlineSnapshot(`"a"`)
})
