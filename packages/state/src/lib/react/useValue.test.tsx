import { useState } from 'react'
import ReactTestRenderer from 'react-test-renderer'
import { Atom, atom } from '../core/Atom'
import { Computed } from '../core/Computed'
import { useAtom } from './useAtom'
import { useComputed } from './useComputed'
import { useValue } from './useValue'

test('useValue returns a value from a computed', async () => {
	let theComputed = null as null | Computed<number>
	let theAtom = null as null | Atom<number>
	function Component() {
		const a = useAtom('a', 1)
		theAtom = a
		const b = useComputed('a+1', () => a.get() + 1, [])
		theComputed = b
		return <>{useValue(b)}</>
	}

	let view: ReactTestRenderer.ReactTestRenderer
	await ReactTestRenderer.act(() => {
		view = ReactTestRenderer.create(<Component />)
	})

	expect(theComputed).not.toBeNull()
	expect(theComputed?.get()).toBe(2)
	expect(theComputed?.name).toBe('useComputed(a+1)')
	expect(view!.toJSON()).toMatchInlineSnapshot(`"2"`)

	await ReactTestRenderer.act(() => {
		theAtom?.set(5)
	})
	expect(view!.toJSON()).toMatchInlineSnapshot(`"6"`)
})

test('useValue returns a value from an atom', async () => {
	let theAtom = null as null | Atom<number>
	function Component() {
		const a = useAtom('a', 1)
		theAtom = a
		return <>{useValue(a)}</>
	}

	let view: ReactTestRenderer.ReactTestRenderer
	await ReactTestRenderer.act(() => {
		view = ReactTestRenderer.create(<Component />)
	})

	expect(view!.toJSON()).toMatchInlineSnapshot(`"1"`)

	await ReactTestRenderer.act(() => {
		theAtom?.set(5)
	})
	expect(view!.toJSON()).toMatchInlineSnapshot(`"5"`)
})

test('useValue returns a value from a compute function', async () => {
	let theAtom = null as null | Atom<number>
	let setB = null as null | ((b: number) => void)
	function Component() {
		const a = useAtom('a', 1)
		const [b, _setB] = useState(1)
		setB = _setB
		theAtom = a
		const c = useValue('a+b', () => a.get() + b, [b])
		return <>{c}</>
	}

	let view: ReactTestRenderer.ReactTestRenderer
	await ReactTestRenderer.act(() => {
		view = ReactTestRenderer.create(<Component />)
	})

	expect(view!.toJSON()).toMatchInlineSnapshot(`"2"`)

	await ReactTestRenderer.act(() => {
		theAtom?.set(5)
	})
	expect(view!.toJSON()).toMatchInlineSnapshot(`"6"`)

	await ReactTestRenderer.act(() => {
		setB!(5)
	})
	expect(view!.toJSON()).toMatchInlineSnapshot(`"10"`)
})

test("useValue doesn't throw when used in a zombie-child component", async () => {
	const theAtom = atom<Record<string, number>>('map', { a: 1, b: 2, c: 3 })
	function Parent() {
		const ids = useValue('ids', () => Object.keys(theAtom.get()), [])
		return (
			<>
				{ids.map((id) => (
					<Child key={id} id={id} />
				))}
			</>
		)
	}
	function Child({ id }: { id: string }) {
		const value = useValue(
			'value',
			() => {
				if (!(id in theAtom.get())) throw new Error('id not found!')
				return theAtom.get()[id]
			},
			[id]
		)
		return <>{value}</>
	}

	let view: ReactTestRenderer.ReactTestRenderer
	await ReactTestRenderer.act(() => {
		view = ReactTestRenderer.create(<Parent />)
	})

	expect(view!.toJSON()).toMatchInlineSnapshot(`
		Array [
		  "1",
		  "2",
		  "3",
		]
	`)

	// remove id 'b' creating a zombie-child
	await ReactTestRenderer.act(() => {
		theAtom?.update(({ b: _, ...rest }) => rest)
	})

	expect(view!.toJSON()).toMatchInlineSnapshot(`
		Array [
		  "1",
		  "3",
		]
	`)
})
