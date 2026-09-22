import {
	InstancePageStateRecordType,
	TLInstancePageState,
	TLPageId,
	TLShapeId,
} from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { cleanupInstancePageState } from './shapeIntegrity'

const PAGE_ID = 'page:page1' as TLPageId

function id(name: string) {
	return `shape:${name}` as TLShapeId
}

function pageState(props: Partial<TLInstancePageState> = {}) {
	return InstancePageStateRecordType.create({
		id: InstancePageStateRecordType.createId('page1'),
		pageId: PAGE_ID,
		...props,
	})
}

describe('cleanupInstancePageState', () => {
	it('returns null when nothing references a departed shape', () => {
		const before = pageState({ selectedShapeIds: [id('a')], hoveredShapeId: id('b') })
		expect(cleanupInstancePageState(before, new Set([id('gone')]))).toBe(null)
	})

	it('returns null for an empty set of departed shapes', () => {
		const before = pageState({ selectedShapeIds: [id('a')] })
		expect(cleanupInstancePageState(before, new Set())).toBe(null)
	})

	it('drops departed ids from every id list and leaves the survivors in order', () => {
		const before = pageState({
			selectedShapeIds: [id('a'), id('gone'), id('b')],
			erasingShapeIds: [id('gone'), id('c')],
			hintingShapeIds: [id('gone')],
		})

		expect(cleanupInstancePageState(before, new Set([id('gone')]))).toEqual({
			...before,
			selectedShapeIds: [id('a'), id('b')],
			erasingShapeIds: [id('c')],
			hintingShapeIds: [],
		})
	})

	it('nulls each single-shape reference that departed, and only those', () => {
		const before = pageState({
			hoveredShapeId: id('gone'),
			editingShapeId: id('gone'),
			croppingShapeId: id('gone'),
			focusedGroupId: id('stays'),
		})

		expect(cleanupInstancePageState(before, new Set([id('gone')]))).toEqual({
			...before,
			hoveredShapeId: null,
			editingShapeId: null,
			croppingShapeId: null,
			focusedGroupId: id('stays'),
		})
	})

	it('does not mutate the page state it was given', () => {
		const before = pageState({
			selectedShapeIds: [id('a'), id('gone')],
			hoveredShapeId: id('gone'),
		})
		const snapshot = structuredClone(before)

		cleanupInstancePageState(before, new Set([id('gone')]))

		expect(before).toEqual(snapshot)
	})
})
