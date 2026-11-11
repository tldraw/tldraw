import {
	AddToLibraryMenuItem,
	BoardLibrarySource,
	LibrariesPanel,
	librariesPanelOpen,
	LibrariesQuickActions,
} from '@tldraw/libraries'
import { useMemo } from 'react'
import {
	librarySchemaRecords,
	createTLSchema,
	DefaultContextMenu,
	DefaultContextMenuContent,
	Editor,
	TLComponents,
	Tldraw,
	useEditor,
	useLocalStore,
	useToasts,
	useTranslation,
} from 'tldraw'
import '@tldraw/libraries/libraries.css'
import 'tldraw/tldraw.css'

// Unlisted, like /libraries: the libraries live in this document's own store, next to its
// shapes. The library records make this schema newer than the default one, so no other page may
// share its persistence key.
export default function LibrariesBoard() {
	const schema = useMemo(() => createTLSchema({ records: librarySchemaRecords }), [])
	const store = useLocalStore({ persistenceKey: 'libraries-board', schema })

	const handleMount = (editor: Editor) => {
		librariesPanelOpen.set(editor, true)
	}

	return (
		<div className="tldraw__editor">
			<Tldraw store={store} components={components} onMount={handleMount} />
		</div>
	)
}

const sources = new WeakMap<Editor, BoardLibrarySource>()

// Made inside the editor's UI, so the source can report a failed upload with a toast.
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
	InFrontOfTheCanvas: function BoardLibrariesPanel() {
		return <LibrariesPanel source={useBoardLibraries()} />
	},
	ContextMenu: function BoardContextMenu(props) {
		const source = useBoardLibraries()
		return (
			<DefaultContextMenu {...props}>
				<AddToLibraryMenuItem source={source} />
				<DefaultContextMenuContent />
			</DefaultContextMenu>
		)
	},
	QuickActions: LibrariesQuickActions,
}
