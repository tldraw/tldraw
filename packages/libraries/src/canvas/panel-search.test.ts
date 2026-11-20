import { LibraryRecordType } from 'tldraw'
import { LibraryItemRecordType, type TLLibraryItem } from '../lib/schema'
import { searchLibraries } from './panel-search'

const shapes = LibraryRecordType.create({ name: 'Shapes' })
const wireframes = LibraryRecordType.create({ name: 'Wireframes' })
const item = (library: { id: TLLibraryItem['libraryId'] }, name?: string) =>
	LibraryItemRecordType.create({ libraryId: library.id, ...(name ? { name } : {}) })

const star = item(shapes, 'Star')
const arrow = item(shapes, 'Arrow')
const unnamed = item(shapes)
const button = item(wireframes, 'Button')
const startButton = item(wireframes, 'Start button')

const items = new Map([
	[shapes.id, [star, arrow, unnamed]],
	[wireframes.id, [button, startButton]],
])
const search = (query: string) =>
	searchLibraries([shapes, wireframes], (library) => items.get(library.id) ?? [], query).map(
		(result) => ({ library: result.library.name, items: result.items.map((i) => i.name) })
	)

it('finds items by name, ignoring case and surrounding space, grouped by library in order', () => {
	expect(search('  STAR ')).toEqual([
		{ library: 'Shapes', items: ['Star'] },
		{ library: 'Wireframes', items: ['Start button'] },
	])
})

it("finds all of a library's items, unnamed ones too, by the library's name", () => {
	expect(search('shapes')).toEqual([{ library: 'Shapes', items: ['Star', 'Arrow', undefined] }])
})

it('leaves out libraries without matches, and finds nothing for an empty query', () => {
	expect(search('button')).toEqual([{ library: 'Wireframes', items: ['Button', 'Start button'] }])
	expect(search('   ')).toEqual([])
	expect(search('nothing like it')).toEqual([])
})
