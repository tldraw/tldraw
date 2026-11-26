import { describe, expect, it } from 'vitest'
import { parseLibraryPack } from './LibraryPack'
import { LibraryItemContentTooNewError } from './schema'

const content = {
	formatVersion: 1,
	content: { shapes: [], rootShapeIds: [], assets: [], schema: {} },
}
const pack = {
	id: 'shapes',
	name: 'Shapes',
	version: 1,
	items: [
		{ id: 'a', content },
		{
			id: 'b',
			name: 'Button',
			content,
			thumbnail: { light: 'data:image/webp;base64,AA', dark: 'data:image/webp;base64,BB' },
			meta: { category: 'Actions' },
		},
	],
}

describe('parseLibraryPack', () => {
	it('returns a valid pack', () => {
		expect(parseLibraryPack(pack)).toEqual(pack)
	})

	it.each([
		['a pack without a name', { ...pack, name: undefined }],
		['a version that is not a positive integer', { ...pack, version: 1.5 }],
		['an item without content', { ...pack, items: [{ id: 'a' }] }],
		[
			'an item whose content has no shapes',
			{ ...pack, items: [{ id: 'a', content: { formatVersion: 1, content: {} } }] },
		],
		['a blank thumbnail', { ...pack, items: [{ id: 'a', content, thumbnail: ' ' }] }],
		[
			'a thumbnail pair without its dark image',
			{ ...pack, items: [{ id: 'a', content, thumbnail: { light: 'x' } }] },
		],
	])('refuses %s', (_, value) => {
		expect(() => parseLibraryPack(value)).toThrow()
	})

	it('refuses an item whose content is in a newer format', () => {
		const items = [{ id: 'a', content: { ...content, formatVersion: 2 } }]
		expect(() => parseLibraryPack({ ...pack, items })).toThrow(LibraryItemContentTooNewError)
	})
})
