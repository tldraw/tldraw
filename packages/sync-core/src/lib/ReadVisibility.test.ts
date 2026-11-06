import { UnknownRecord } from '@tldraw/store'
import { TLRecordReader } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { RoomVisibility, VisibilityIndex } from './ReadVisibility'

interface Rec extends UnknownRecord {
	parentId?: string
	hidden?: boolean
}

function room(input: Array<{ id: string; typeName: string; parentId?: string; hidden?: boolean }>) {
	const records = input as Rec[]
	const map = new Map<string, Rec>(records.map((r) => [r.id, r]))
	const reader: TLRecordReader<Rec> = { get: (id) => map.get(id), all: () => map.values() }
	return {
		map,
		reader,
		put: (r: { id: string; typeName: string; parentId?: string; hidden?: boolean }) =>
			map.set(r.id as Rec['id'], r as Rec),
		remove: (id: string) => map.delete(id as Rec['id']),
	}
}

// a record is hidden when it, or its parent, is hidden
function canReadCounting() {
	const calls: string[] = []
	const canRead = (record: Rec, ctx: { records: TLRecordReader<Rec> }) => {
		calls.push(record.id)
		if (record.hidden) return false
		const parent = record.parentId ? ctx.records.get(record.parentId) : undefined
		return !parent?.hidden
	}
	return { canRead, calls }
}

const access = { userId: 'u', abilities: [] }

describe('VisibilityIndex', () => {
	it('hides and shows a record when a record it read changes, without the record changing', () => {
		const r = room([
			{ id: 'page', typeName: 'page' },
			{ id: 'a', typeName: 'shape', parentId: 'page' },
			{ id: 'b', typeName: 'shape', parentId: 'other' },
		])
		const { canRead } = canReadCounting()
		const index = new VisibilityIndex<Rec>(access, canRead as any)
		index.build(r.map.keys(), r.reader)
		expect([...index.visible].sort()).toEqual(['a', 'b', 'page'])

		r.put({ id: 'page', typeName: 'page', hidden: true })
		expect(index.update(['page'], r.reader)).toEqual({
			shown: new Set(),
			hidden: new Set(['page', 'a']),
		})

		r.put({ id: 'page', typeName: 'page' })
		expect(index.update(['page'], r.reader)).toEqual({
			shown: new Set(['page', 'a']),
			hidden: new Set(),
		})
	})

	it('checks a record again when a record it looked for, and did not find, appears', () => {
		const r = room([{ id: 'b', typeName: 'shape', parentId: 'other' }])
		const { canRead } = canReadCounting()
		const index = new VisibilityIndex<Rec>(access, canRead as any)
		index.build(r.map.keys(), r.reader)
		r.put({ id: 'other', typeName: 'page', hidden: true })
		expect(index.update(['other'], r.reader).hidden).toEqual(new Set(['b']))
	})

	it('checks only the changed record and its readers, not the whole room', () => {
		const records: Array<{ id: string; typeName: string; parentId?: string }> = [
			{ id: 'page', typeName: 'page' },
		]
		for (let i = 0; i < 1000; i++)
			records.push({ id: `s${i}`, typeName: 'shape', parentId: 'page' })
		const r = room(records)
		const { canRead, calls } = canReadCounting()
		const index = new VisibilityIndex<Rec>(access, canRead as any)
		index.build(r.map.keys(), r.reader)
		calls.length = 0
		r.put({ id: 's5', typeName: 'shape', parentId: 'page' })
		index.update(['s5'], r.reader)
		expect(calls).toEqual(['s5'])
	})

	it('drops a deleted record', () => {
		const r = room([{ id: 'a', typeName: 'shape' }])
		const index = new VisibilityIndex<Rec>(access, canReadCounting().canRead as any)
		index.build(r.map.keys(), r.reader)
		r.remove('a')
		expect(index.update(['a'], r.reader).hidden).toEqual(new Set(['a']))
		expect(index.visible.size).toBe(0)
	})

	it('hides a record whose check throws', () => {
		const r = room([{ id: 'a', typeName: 'shape' }])
		const index = new VisibilityIndex<Rec>(access, (() => {
			throw new Error('boom')
		}) as any)
		index.build(r.map.keys(), r.reader)
		expect(index.visible.size).toBe(0)
	})

	it('checks a record that scanned the whole room again on every change', () => {
		const r = room([
			{ id: 'a', typeName: 'shape' },
			{ id: 'flag', typeName: 'flag' },
		])
		// visible while no record is hidden
		const canRead = (_: Rec, ctx: { records: TLRecordReader<Rec> }) =>
			![...ctx.records.all()].some((x) => x.hidden)
		const index = new VisibilityIndex<Rec>(access, canRead as any)
		index.build(r.map.keys(), r.reader)
		r.put({ id: 'flag', typeName: 'flag', hidden: true })
		expect(index.update(['flag'], r.reader).hidden).toEqual(new Set(['a', 'flag']))
	})
})

describe('RoomVisibility', () => {
	it('shares one index between sessions with the same access, and drops unused ones', () => {
		const r = room([{ id: 'a', typeName: 'shape' }])
		const { canRead, calls } = canReadCounting()
		const visibility = new RoomVisibility<Rec>(canRead as any)
		const one = visibility.indexFor(
			{ userId: 'u', abilities: ['x', 'y'] },
			() => r.map.keys(),
			r.reader
		)
		const two = visibility.indexFor(
			{ userId: 'u', abilities: ['y', 'x'] },
			() => r.map.keys(),
			r.reader
		)
		expect(one).toBe(two)
		expect(calls).toEqual(['a'])
		visibility.retain([])
		const three = visibility.indexFor(
			{ userId: 'u', abilities: ['x', 'y'] },
			() => r.map.keys(),
			r.reader
		)
		expect(three).not.toBe(one)
	})
})
