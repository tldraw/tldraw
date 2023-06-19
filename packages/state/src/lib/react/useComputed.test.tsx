import { useState } from 'react'
import ReactTestRenderer from 'react-test-renderer'
import { Atom } from '../core/Atom'
import { Computed } from '../core/Computed'
import { useAtom } from './useAtom'
import { useComputed } from './useComputed'
import { useValue } from './useValue'

test('useComputed returns a computed value', async () => {
	let theComputed = null as null | Computed<number>
	let theAtom = null as null | Atom<number>
	function Component() {
		const a = useAtom('a', 1)
		theAtom = a
		const b = useComputed('a+1', () => a.value + 1, [])
		theComputed = b
		return <>{useValue(b)}</>
	}

	let view: ReactTestRenderer.ReactTestRenderer
	await ReactTestRenderer.act(() => {
		view = ReactTestRenderer.create(<Component />)
	})

	expect(theComputed).not.toBeNull()
	expect(theComputed?.value).toBe(2)
	expect(theComputed?.name).toBe('useComputed(a+1)')
	expect(view!.toJSON()).toMatchInlineSnapshot(`"2"`)

	await ReactTestRenderer.act(() => {
		theAtom?.set(5)
	})
	expect(view!.toJSON()).toMatchInlineSnapshot(`"6"`)
})

test('useComputed has a dependencies array that allows creating a new computed', async () => {
	let theComputed = null as null | Computed<number>
	let theAtom = null as null | Atom<number>
	let setCount = null as null | ((count: number) => void)
	function Component() {
		const [count, _setCount] = useState(0)
		setCount = _setCount
		const a = useAtom('a', 1)
		theAtom = a
		const b = useComputed('a+1', () => a.value + 1, [count])
		theComputed = b
		return <>{useValue(b)}</>
	}

	let view: ReactTestRenderer.ReactTestRenderer
	await ReactTestRenderer.act(() => {
		view = ReactTestRenderer.create(<Component />)
	})

	const initialComputed = theComputed

	expect(theComputed).not.toBeNull()
	expect(theComputed?.value).toBe(2)
	expect(theComputed?.name).toBe('useComputed(a+1)')
	expect(view!.toJSON()).toMatchInlineSnapshot(`"2"`)

	await ReactTestRenderer.act(() => {
		theAtom?.set(5)
	})
	expect(view!.toJSON()).toMatchInlineSnapshot(`"6"`)

	expect(initialComputed).toBe(theComputed)

	await ReactTestRenderer.act(() => {
		setCount?.(2)
	})

	expect(initialComputed).not.toBe(theComputed)
})

test('useComputed allows optionally passing options', async () => {
	let theComputed = null as null | Computed<number>
	let theAtom = null as null | Atom<number>
	let setCount = null as null | ((count: number) => void)
	const isEqual = jest.fn((a, b) => a === b)
	function Component() {
		const [count, _setCount] = useState(0)
		setCount = _setCount
		const a = useAtom('a', 1)
		theAtom = a
		const b = useComputed('a+1', () => a.value + 1, { isEqual }, [count])
		theComputed = b
		return <>{useValue(b)}</>
	}

	let view: ReactTestRenderer.ReactTestRenderer
	await ReactTestRenderer.act(() => {
		view = ReactTestRenderer.create(<Component />)
	})

	const initialComputed = theComputed

	expect(theComputed).not.toBeNull()
	expect(theComputed?.value).toBe(2)
	expect(theComputed?.name).toBe('useComputed(a+1)')
	expect(view!.toJSON()).toMatchInlineSnapshot(`"2"`)

	await ReactTestRenderer.act(() => {
		theAtom?.set(5)
	})
	expect(view!.toJSON()).toMatchInlineSnapshot(`"6"`)

	expect(initialComputed).toBe(theComputed)

	await ReactTestRenderer.act(() => {
		setCount?.(2)
	})

	expect(initialComputed).not.toBe(theComputed)

	expect(isEqual).toHaveBeenCalled()
})
