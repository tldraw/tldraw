import {
	AddToLibraryMenuItem,
	BoardLibrarySource,
	LibrariesPanel,
	librariesPanelOpen,
	LibrariesQuickActions,
} from '@tldraw/libraries'
import { useMemo, useState } from 'react'
import {
	librarySchemaRecords,
	createTLSchema,
	DefaultContextMenu,
	DefaultContextMenuContent,
	Editor,
	TLComponents,
	Tldraw,
	useLocalStore,
} from 'tldraw'
import '@tldraw/libraries/libraries.css'
import 'tldraw/tldraw.css'

// Unlisted, like /libraries: the libraries live in this document's own store, next to its
// shapes. The library records make this schema newer than the default one, so no other page may
// share its persistence key.
export default function LibrariesBoard() {
	const schema = useMemo(() => createTLSchema({ records: librarySchemaRecords }), [])
	const store = useLocalStore({ persistenceKey: 'libraries-board', schema })
	const [source, setSource] = useState<BoardLibrarySource>()

	const components = useMemo<TLComponents>(() => {
		if (!source) return {}
		return {
			InFrontOfTheCanvas: () => <LibrariesPanel source={source} />,
			ContextMenu: (props) => (
				<DefaultContextMenu {...props}>
					<AddToLibraryMenuItem source={source} />
					<DefaultContextMenuContent />
				</DefaultContextMenu>
			),
			QuickActions: LibrariesQuickActions,
		}
	}, [source])

	const handleMount = (editor: Editor) => {
		setSource(new BoardLibrarySource(editor))
		librariesPanelOpen.set(editor, true)
	}

	return (
		<div className="tldraw__editor">
			<Tldraw store={store} components={components} onMount={handleMount} />
		</div>
	)
}
