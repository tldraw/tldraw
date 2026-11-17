import {
	addPackToDocument,
	findPackCopy,
	type LibraryBrowseGroup,
	type LibraryPack,
	type LibrarySource,
} from '@tldraw/libraries'
import diagramming from './libraries-pack-diagramming.json'
import doodles from './libraries-pack-doodles.json'
import tldrawCharacters from './libraries-pack-tldraw-characters.json'
import wireframing from './libraries-pack-wireframing.json'

export const PACKS = [
	wireframing,
	diagramming,
	tldrawCharacters,
	doodles,
] as unknown as LibraryPack[]

// The shipped packs, as a "Public libraries" group to browse: adding one copies it to the owner
// given, such as the user's own workspace, or adds the copy they already have.
export function getPackBrowseGroups(source: LibrarySource, ownerId: string): LibraryBrowseGroup[] {
	const libraries = source.getLibraries()
	const canAdd = source.can('createLibrary', { ownerId })
	return [
		{
			id: 'public',
			label: 'Public libraries',
			entries: PACKS.map((pack) => ({
				id: pack.id,
				name: pack.name,
				itemCount: pack.items.length,
				previews: pack.items.slice(0, 4).map((item) => item.thumbnail),
				added: findPackCopy(libraries, pack.id) !== undefined,
				canAdd,
				add: () => addPackToDocument(source, pack.id, async () => pack, { ownerId }),
			})),
		},
	]
}
