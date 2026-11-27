import {
	addPackToDocument,
	findPackCopy,
	InMemoryLibrarySource,
	type InMemoryLibrarySourceOptions,
	type LibraryBrowseGroup,
	LibraryItemRecordType,
	type LibraryPack,
	type LibraryPackItem,
	type LibrarySource,
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

// The shipped packs, as a "Public libraries" group to browse: adding one copies it to the owner
// given, such as the user's own workspace, or adds the copy they already have. Removing one removes
// that copy from the document, and keeps it.
export function getPackBrowseGroups(source: LibrarySource, ownerId: string): LibraryBrowseGroup[] {
	const libraries = source.getLibraries()
	const canAdd = source.can('createLibrary', { ownerId })
	return [
		{
			id: 'public',
			label: 'Public libraries',
			entries: Object.values(PACKS).map((pack) => {
				const shown = findPackCopy(libraries, pack.id)
				const remove = source.removeLibraryFromDocument
				return {
					id: pack.id,
					name: pack.name,
					itemCount: pack.items.length,
					previews: pack.items.slice(0, 4).map((item) => item.thumbnail),
					added: shown !== undefined,
					libraryId: shown?.id,
					canAdd,
					add: () => addPackToDocument(source, pack.id, async () => pack, { ownerId }),
					remove:
						shown && remove && source.can('removeLibraryFromDocument', shown.id)
							? () => remove.call(source, shown.id)
							: undefined,
					getItems: async () => pack.items,
				}
			}),
		},
	]
}
