import {
	InMemoryLibrarySource,
	LibraryItemRecordType,
	type LibraryPack,
	LibraryRecordType,
	type TLLibrary,
	type TLLibraryId,
	type TLLibraryItem,
	type TLLibraryItemContent,
	type TLLibraryItemId,
} from '@tldraw/libraries'
import { PACKS } from '../../libraries-fixtures/packs'

const { wireframing, diagramming, doodles, tldrawCharacters: characters } = PACKS

interface SampleLibrary {
	name: string
	items: [LibraryPack, string[]]
	libraries?: SampleLibrary[]
	shown?: boolean
}

const SAMPLES: SampleLibrary[] = [
	{
		name: 'Simple Design System',
		shown: true,
		items: [wireframing, ['Navigation bar']],
		libraries: [
			{ name: 'Buttons', items: [wireframing, ['Button', 'Checkbox']] },
			{
				name: 'Cards',
				items: [wireframing, ['Card', 'Avatar']],
				libraries: [
					{
						name: 'Profile cards',
						items: [doodles, ['Waving person', 'Standing person', 'Bean']],
					},
				],
			},
			{ name: 'Forms', items: [wireframing, ['Input', 'Checkbox', 'Button']] },
		],
	},
	{
		name: 'Diagramming',
		shown: true,
		items: [diagramming, ['Note', 'Arrow']],
		libraries: [
			{
				name: 'Flowchart',
				items: [diagramming, ['Process', 'Decision', 'Start or end', 'Step to decision']],
			},
		],
	},
	{
		name: 'Doodles',
		items: [doodles, ['Fairy', 'Skateboarder', 'Bunny', 'Dog', 'Dancing blob', 'Cheering blob']],
		libraries: [
			{
				name: 'Builders',
				items: [doodles, ['Builder in hi-vis', 'Builder in stripes', 'Builder with sign']],
			},
		],
	},
	{ name: 'tldraw characters', items: [characters, ['Penta', 'Cloudy', 'Diamond', 'Arrow']] },
]

// [1]
function seed() {
	const libraries: TLLibrary[] = []
	const items: TLLibraryItem[] = []
	const contents: Record<TLLibraryItemId, TLLibraryItemContent> = {}
	const add = (sample: SampleLibrary, parentId?: TLLibraryId) => {
		const library = LibraryRecordType.create({
			name: sample.name,
			...(parentId === undefined ? {} : { parentId }),
		})
		libraries.push(library)
		const [pack, names] = sample.items
		for (const name of names) {
			const packItem = pack.items.find((each) => each.name === name)
			if (!packItem) throw new Error(`No item called ${name} in ${pack.name}`)
			const item = LibraryItemRecordType.create({
				libraryId: library.id,
				name,
				...(packItem.thumbnail === undefined ? {} : { thumbnail: packItem.thumbnail }),
			})
			items.push(item)
			contents[item.id] = packItem.content
		}
		for (const child of sample.libraries ?? []) add(child, library.id)
		return library
	}
	const shownInDocument = SAMPLES.flatMap((sample) => {
		const library = add(sample)
		return sample.shown ? [{ libraryId: library.id, placement: 'added' as const }] : []
	})
	return { initial: { libraries, items, contents }, shownInDocument }
}

export const source = new InMemoryLibrarySource({ id: 'libraries-nested-drill-in', ...seed() })

/*
[1]
Libraries are listed flat: a library inside another names it as its `parentId`. Only top-level
libraries are added to a document (`shownInDocument`); the libraries inside one come with it. The
two that aren't shown are the ones "Add more libraries" offers.
*/
