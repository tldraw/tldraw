import {
	AddToLibraryMenuItem,
	BoardLibrarySource,
	LibrariesPanel,
	librariesPanelOpen,
	LibrariesQuickActions,
} from '@tldraw/libraries'
import { useMemo } from 'react'
import {
	createTLSchema,
	createTLStore,
	DefaultContextMenu,
	DefaultContextMenuContent,
	Editor,
	librarySchemaRecords,
	TLComponents,
	Tldraw,
	useEditor,
	useToasts,
	useTranslation,
} from 'tldraw'
import '@tldraw/libraries/libraries.css'
import 'tldraw/tldraw.css'

const sources = new WeakMap<Editor, BoardLibrarySource>()

// [1]
function useBoardLibraries() {
	const editor = useEditor()
	const toasts = useToasts()
	const msg = useTranslation()
	let source = sources.get(editor)
	if (!source) {
		source = new BoardLibrarySource(editor, { toasts, msg })
		sources.set(editor, source)
	}
	return source
}

const components: TLComponents = {
	InFrontOfTheCanvas: () => <LibrariesPanel source={useBoardLibraries()} />,
	QuickActions: LibrariesQuickActions,
	ContextMenu: (props) => (
		<DefaultContextMenu {...props}>
			<AddToLibraryMenuItem source={useBoardLibraries()} />
			<DefaultContextMenuContent />
		</DefaultContextMenu>
	),
}

export default function LibrariesBoardExample() {
	// [2]
	const store = useMemo(
		() => createTLStore({ schema: createTLSchema({ records: librarySchemaRecords }) }),
		[]
	)

	return (
		<div className="tldraw__editor">
			<Tldraw
				store={store}
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
`BoardLibrarySource` keeps its libraries in the editor's own store, so there is one source per
editor. It's made inside the editor's UI so that it can report a thumbnail that fails to upload
with a toast.

[2]
Library records live next to the shapes, so the store's schema must register
`librarySchemaRecords`. They are then saved, synced and copied wherever the document is.
*/
