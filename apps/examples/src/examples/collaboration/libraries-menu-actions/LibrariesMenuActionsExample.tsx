import {
	ItemMenu,
	type ItemMenuProps,
	type LibrariesComponents,
	LibrariesPanel,
	librariesPanelOpen,
	LibrariesQuickActions,
	LibraryMenu,
	LibraryMenuItem,
	type LibraryMenuProps,
	type LibrarySource,
	type TLLibrary,
	type TLLibraryItem,
} from '@tldraw/libraries'
import { TLComponents, Tldraw, useToasts } from 'tldraw'
import '@tldraw/libraries/libraries.css'
import 'tldraw/tldraw.css'
import { PACKS, packSource } from '../../../libraries-fixtures/packs'

const source = packSource('libraries-menu-actions', [PACKS.wireframing, PACKS.diagramming])

function useCopy() {
	const { addToast } = useToasts()
	return (text: string, title: string, description?: string) =>
		navigator.clipboard.writeText(text).then(
			() => addToast({ title, description }),
			() => addToast({ title: "Couldn't copy to the clipboard", severity: 'error' })
		)
}

// [1]
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

const librariesComponents: LibrariesComponents = {
	LibraryMenu: LibraryMenuWithExport,
	ItemMenu: ItemMenuWithExport,
}

const components: TLComponents = {
	InFrontOfTheCanvas: () => <LibrariesPanel source={source} components={librariesComponents} />,
	QuickActions: LibrariesQuickActions,
}

export default function LibrariesMenuActionsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={components}
				onMount={(editor) => {
					librariesPanelOpen.set(editor, true)
				}}
			/>
		</div>
	)
}

/*
[1]
`LibraryMenu` and `ItemMenu` are the default menus that a right-click on a library's name or an
item opens. Children passed to them join the default items, so an override that renders the
default with children of its own, passing on the props it gets, keeps rename, delete and the rest.
*/
