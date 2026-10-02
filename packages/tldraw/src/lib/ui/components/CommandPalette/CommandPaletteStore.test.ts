import { describe, expect, it, vi } from 'vitest'
import { CommandPaletteEntry, CommandPaletteStore } from './CommandPaletteStore'

function entry(id: string, marker: Element | null): CommandPaletteEntry {
	return {
		id,
		label: id,
		name: id,
		path: [],
		submenu: null,
		section: null,
		disabled: false,
		onSelect: vi.fn(),
		marker,
	}
}

function markers(count: number) {
	const parent = document.createElement('div')
	return Array.from({ length: count }, () => parent.appendChild(document.createElement('span')))
}

const ids = (store: CommandPaletteStore) => store.entries.get().map((e) => e.id)

describe('CommandPaletteStore', () => {
	it('orders entries by marker position, not registration order', () => {
		const [first, second] = markers(2)
		const store = new CommandPaletteStore()
		store.set('t1', entry('b', second))
		store.set('t2', entry('a', first))
		expect(ids(store)).toEqual(['a', 'b'])
	})

	it('keeps the first entry when two share an id', () => {
		const [first, second] = markers(2)
		const store = new CommandPaletteStore()
		store.set('late', { ...entry('dup', second), label: 'second' })
		store.set('early', { ...entry('dup', first), label: 'first' })
		expect(store.entries.get().map((e) => e.label)).toEqual(['first'])
	})

	it('replaces an entry when its token registers again', () => {
		const [marker] = markers(1)
		const store = new CommandPaletteStore()
		store.set('t', entry('a', marker))
		store.set('t', { ...entry('a', marker), disabled: true })
		expect(store.entries.get()).toHaveLength(1)
		expect(store.entries.get()[0].disabled).toBe(true)
	})

	it('drops an entry when it unregisters', () => {
		const [marker] = markers(1)
		const store = new CommandPaletteStore()
		store.set('t', entry('a', marker))
		store.delete('t')
		expect(ids(store)).toEqual([])
	})

	it('puts entries without a marker last', () => {
		const [marker] = markers(1)
		const store = new CommandPaletteStore()
		store.set('t1', entry('unmounted', null))
		store.set('t2', entry('mounted', marker))
		expect(ids(store)).toEqual(['mounted', 'unmounted'])
	})
})
