import {
	ItemMenu,
	type ItemMenuProps,
	type LibrariesComponents,
	LibraryMenu,
	LibraryMenuItem,
	type LibraryMenuProps,
	type LibrarySource,
	type TLLibrary,
	type TLLibraryItem,
} from '@tldraw/libraries'
import { useToasts } from 'tldraw'
import type { Showing } from '../libraries-example'
import { PACKS, packSource } from './pack-source'

function useCopy() {
	const { addToast } = useToasts()
	return (text: string, title: string, description?: string) =>
		navigator.clipboard.writeText(text).then(
			() => addToast({ title, description }),
			() => addToast({ title: "Couldn't copy to the clipboard", severity: 'error' })
		)
}

function LibraryMenuWithExport(
	props: LibraryMenuProps & { source: LibrarySource; library: TLLibrary }
) {
	const { source, library } = props
	const copy = useCopy()
	return (
		<LibraryMenu {...props}>
			<LibraryMenuItem
				label="Copy link"
				onClick={() =>
					copy(`${location.origin}/libraries/${library.id}`, 'Link copied', library.name)
				}
			/>
			<LibraryMenuItem
				label="Export as JSON"
				onClick={() => {
					const items = source.getItems(library.id)
					copy(
						JSON.stringify({ library, items }, null, '\t'),
						`Copied ${items.length} items as JSON`,
						library.name
					)
				}}
			/>
		</LibraryMenu>
	)
}

function ItemMenuWithExport(props: ItemMenuProps & { item: TLLibraryItem }) {
	const { item } = props
	const copy = useCopy()
	return (
		<ItemMenu {...props}>
			<LibraryMenuItem
				label="Copy link"
				onClick={() =>
					copy(`${location.origin}/libraries/items/${item.id}`, 'Link copied', item.name)
				}
			/>
			<LibraryMenuItem
				label="Export as JSON"
				onClick={() => copy(JSON.stringify(item, null, '\t'), 'Copied item as JSON', item.name)}
			/>
		</ItemMenu>
	)
}

const components: LibrariesComponents = {
	LibraryMenu: LibraryMenuWithExport,
	ItemMenu: ItemMenuWithExport,
}

export const extraActions: Showing = {
	source: packSource('showcase-extra-actions', [PACKS.wireframing, PACKS.diagramming]),
	components,
}
