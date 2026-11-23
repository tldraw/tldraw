import {
	InMemoryLibrarySource,
	type InMemoryLibrarySourceOptions,
	LibraryItemRecordType,
	type LibraryPack,
	type LibraryPackItem,
	LibraryRecordType,
	type TLLibraryItem,
	type TLLibraryItemContent,
	type TLLibraryItemId,
} from '@tldraw/libraries'
import diagramming from './packs/diagramming.json'
import doodles from './packs/doodles.json'
import tldrawCharacters from './packs/tldraw-characters.json'
import wireframing from './packs/wireframing.json'

export const PACKS = {
	wireframing: wireframing as unknown as LibraryPack,
	diagramming: diagramming as unknown as LibraryPack,
	tldrawCharacters: tldrawCharacters as unknown as LibraryPack,
	doodles: doodles as unknown as LibraryPack,
}

export interface PackSourceOptions {
	can?: InMemoryLibrarySourceOptions['can']
	/** Extra fields for each item's record, e.g. its `meta`. */
	itemFields?(
		item: LibraryPackItem,
		index: number
	): Partial<Pick<TLLibraryItem, 'meta' | 'createdAt'>>
}

// A library per pack, filled with the pack's items as records, so they can carry meta and dates.
export function packSource(id: string, packs: LibraryPack[], options: PackSourceOptions = {}) {
	const libraries = packs.map((pack) => LibraryRecordType.create({ name: pack.name }))
	const entries = packs.flatMap((pack, i) =>
		pack.items.map((item, index) => ({
			record: LibraryItemRecordType.create({
				libraryId: libraries[i].id,
				name: item.name,
				thumbnail: item.thumbnail,
				...(options.itemFields ? options.itemFields(item, index) : {}),
			}),
			content: item.content,
		}))
	)
	const contents: Record<TLLibraryItemId, TLLibraryItemContent> = Object.fromEntries(
		entries.map(({ record, content }) => [record.id, content])
	)
	return new InMemoryLibrarySource({
		id,
		can: options.can,
		initial: { libraries, items: entries.map(({ record }) => record), contents },
	})
}
