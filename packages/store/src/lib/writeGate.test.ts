import { describe, expect, it, vi } from 'vitest'
import { BaseRecord, RecordId } from './BaseRecord'
import { createRecordType } from './RecordType'
import { Store, StoreWriteGate } from './Store'
import { StoreSchema } from './StoreSchema'

interface Note extends BaseRecord<'note', RecordId<Note>> {
	text: string
	owner: string
}
const Note = createRecordType<Note>('note', { scope: 'document' }).withDefaultProperties(() => ({
	text: '',
	owner: '',
}))

interface Pointer extends BaseRecord<'pointer', RecordId<Pointer>> {
	x: number
}
const Pointer = createRecordType<Pointer>('pointer', { scope: 'session' }).withDefaultProperties(
	() => ({ x: 0 })
)

type R = Note | Pointer

function setup(gate: StoreWriteGate<R>) {
	const store = new Store<R, unknown>({
		schema: StoreSchema.create<R>({ note: Note, pointer: Pointer }),
		props: {},
	})
	const spy = vi.fn(gate)
	store.setWriteGate(spy)
	return { store, gate: spy }
}

const a = Note.create({ id: Note.createId('a'), text: 'a' })
const b = Note.create({ id: Note.createId('b'), text: 'b' })
const p = Pointer.create({ id: Pointer.createId('p') })

describe('store write gate', () => {
	it('sees the net document changes of one operation, once', () => {
		const { store, gate } = setup(() => true)
		store.atomic(() => {
			store.put([a])
			store.put([{ ...a, text: 'a2' }])
			store.put([p])
		})
		expect(gate).toHaveBeenCalledTimes(1)
		expect(gate.mock.calls[0][0]).toEqual([{ before: null, after: { ...a, text: 'a2' } }])
	})

	it('reverts every change of a denied operation, in every scope', () => {
		const { store } = setup(() => true)
		store.put([a])
		store.setWriteGate(() => false)
		store.atomic(() => {
			store.put([{ ...a, text: 'changed' }, b, p])
		})
		expect(store.get(a.id)).toEqual(a)
		expect(store.get(b.id)).toBeUndefined()
		expect(store.get(p.id)).toBeUndefined()
	})

	it('applies replacement records as part of the same operation', () => {
		const { store } = setup((changes) => changes.map((c) => ({ ...c.after!, owner: 'me' }) as R))
		store.put([a])
		expect(store.get(a.id)).toEqual({ ...a, owner: 'me' })
	})

	it('ignores a record that one operation creates and deletes', () => {
		const { store, gate } = setup(() => false)
		store.atomic(() => {
			store.put([a])
			store.remove([a.id])
		})
		expect(gate).not.toHaveBeenCalled()
		expect(store.get(a.id)).toBeUndefined()
	})

	it('checks a batch once, and reverts all of it together', () => {
		const { store, gate } = setup((changes) => changes.length < 2)
		store.batchWriteGate(() => {
			store.put([a])
			store.put([b])
		})
		expect(gate).toHaveBeenCalledTimes(1)
		expect(store.get(a.id)).toBeUndefined()
		expect(store.get(b.id)).toBeUndefined()
	})

	it('still checks a batch that throws, so its committed writes are not left unchecked', () => {
		const { store } = setup(() => false)
		expect(() =>
			store.batchWriteGate(() => {
				store.put([a])
				throw new Error('boom')
			})
		).toThrow('boom')
		expect(store.get(a.id)).toBeUndefined()
	})

	it('skips remote changes and operations with side effects off', () => {
		const { store, gate } = setup(() => false)
		store.mergeRemoteChanges(() => store.put([a]))
		store.atomic(() => store.put([b]), false)
		expect(gate).not.toHaveBeenCalled()
		expect(store.get(a.id)).toBeDefined()
		expect(store.get(b.id)).toBeDefined()
	})
})
