import type { TLLibraryId } from '@tldraw/tlschema'
import { getLibraryDropTarget, type LibraryDropSection } from './library-drop-target'

const list = { left: 0, top: 50, right: 260, bottom: 450 }

const section = (id: string, top: number, bottom: number, accepts = true): LibraryDropSection => ({
	libraryId: id as TLLibraryId,
	rect: { left: 0, top, right: 260, bottom },
	accepts,
})

const sections = [section('a', 50, 200), section('b', 200, 350, false), section('c', 350, 600)]

it('finds the section under the point', () => {
	expect(getLibraryDropTarget({ x: 100, y: 120 }, list, sections)).toBe('a')
	expect(getLibraryDropTarget({ x: 100, y: 400 }, list, sections)).toBe('c')
})

it('skips a library that takes no new items', () => {
	expect(getLibraryDropTarget({ x: 100, y: 250 }, list, sections)).toBeUndefined()
})

it('finds nothing outside the list', () => {
	expect(getLibraryDropTarget({ x: 300, y: 120 }, list, sections)).toBeUndefined()
})

it('finds nothing in the part of a section scrolled out of the list', () => {
	expect(getLibraryDropTarget({ x: 100, y: 500 }, list, sections)).toBeUndefined()
	expect(getLibraryDropTarget({ x: 100, y: 30 }, list, [section('a', 0, 200)])).toBeUndefined()
})

it('finds nothing between sections', () => {
	expect(
		getLibraryDropTarget({ x: 100, y: 210 }, list, [section('a', 50, 200), section('c', 220, 400)])
	).toBeUndefined()
})
