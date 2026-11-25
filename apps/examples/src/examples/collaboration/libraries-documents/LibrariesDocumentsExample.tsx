import {
	AddToLibraryMenuItem,
	BoardIcon,
	BoardLibrarySource,
	CompositeLibrarySource,
	InMemoryLibrarySource,
	LibrariesPanel,
	librariesPanelOpen,
	LibrariesQuickActions,
	LibraryRecordType,
	type LibrarySource,
} from '@tldraw/libraries'
import { useMemo } from 'react'
import {
	atom,
	createTLSchema,
	DefaultContextMenu,
	DefaultContextMenuContent,
	Editor,
	librarySchemaRecords,
	TLComponents,
	Tldraw,
	TldrawUiButton,
	useEditor,
	useLocalStore,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import '@tldraw/libraries/libraries.css'
import 'tldraw/tldraw.css'
import './libraries-documents.css'
import { HomeIcon, PeopleIcon } from '../../../libraries-fixtures/owner-icons'
import { getPackBrowseGroups } from '../../../libraries-fixtures/packs'
import { saveSamples, shapeSample, WIREFRAMES } from '../../../libraries-fixtures/samples'
import { DocumentLibrariesSource } from './document-libraries-source'

const libraries = {
	myStash: LibraryRecordType.create({ name: 'My stash', ownerId: 'my-workspace' }),
	shapes: LibraryRecordType.create({ name: 'Shapes', ownerId: 'my-workspace' }),
	wireframes: LibraryRecordType.create({ name: 'Wireframes', ownerId: 'design-team' }),
	components: LibraryRecordType.create({ name: 'Components', ownerId: 'design-team' }),
}

const workspaces = new InMemoryLibrarySource({
	id: 'libraries-workspaces',
	owners: [
		{ id: 'my-workspace', name: 'My workspace', icon: <HomeIcon /> },
		{ id: 'design-team', name: 'Design team', icon: <PeopleIcon /> },
	],
	defaultOwnerId: 'my-workspace',
	initial: { libraries: Object.values(libraries), items: [], contents: {} },
})

let seeded: Promise<void> | undefined

function seedOnce(editor: Editor) {
	seeded ??= (async () => {
		await saveSamples(editor, workspaces, libraries.myStash.id, [shapeSample(0), shapeSample(1)])
		await saveSamples(editor, workspaces, libraries.shapes.id, [2, 3, 4, 5].map(shapeSample))
		await saveSamples(editor, workspaces, libraries.wireframes.id, WIREFRAMES)
		await saveSamples(editor, workspaces, libraries.components.id, WIREFRAMES.slice(0, 2))
	})().catch((error) => console.error('[libraries] seeding failed', error))
}

interface DocumentFile {
	id: string
	name: string
	libraries: DocumentLibrariesSource
}

const FILES: DocumentFile[] = [
	{
		id: 'file-a',
		name: 'File A',
		libraries: new DocumentLibrariesSource('file-a', workspaces, libraries.myStash.id, [
			libraries.wireframes.id,
		]),
	},
	{
		id: 'file-b',
		name: 'File B',
		libraries: new DocumentLibrariesSource('file-b', workspaces, libraries.myStash.id),
	},
]

const currentFile = atom('current file', FILES[0])

export default function LibrariesDocumentsExample() {
	const file = useValue(currentFile)
	return <FileEditor key={file.id} file={file} />
}

function FileEditor({ file }: { file: DocumentFile }) {
	const schema = useMemo(() => createTLSchema({ records: librarySchemaRecords }), [])
	const store = useLocalStore({ persistenceKey: `libraries-documents-${file.id}`, schema })
	const components = useMemo(() => makeComponents(file), [file])

	const handleMount = (editor: Editor) => {
		librariesPanelOpen.set(editor, true)
		seedOnce(editor)
	}

	return (
		<div className="tldraw__editor">
			<Tldraw store={store} components={components} onMount={handleMount} />
		</div>
	)
}

function FileSwitcher() {
	const current = useValue(currentFile)
	return (
		<div className="tlui-menu libraries-documents-switcher">
			{FILES.map((file) => (
				<TldrawUiButton
					key={file.id}
					type="normal"
					isActive={file === current}
					onClick={() => currentFile.set(file)}
				>
					{file.name}
				</TldrawUiButton>
			))}
		</div>
	)
}

const sources = new WeakMap<Editor, LibrarySource>()

function makeComponents(file: DocumentFile): TLComponents {
	function useFileLibraries() {
		const editor = useEditor()
		const toasts = useToasts()
		const msg = useTranslation()
		let source = sources.get(editor)
		if (!source) {
			source = new CompositeLibrarySource({
				id: 'libraries-documents',
				defaultOwnerId: 'my-workspace',
				parts: [
					{ source: file.libraries },
					{
						owner: { id: file.id, name: 'This board', icon: <BoardIcon /> },
						source: new BoardLibrarySource(editor, { id: `board:${file.id}`, toasts, msg }),
					},
				],
			})
			sources.set(editor, source)
		}
		return source
	}

	return {
		TopPanel: FileSwitcher,
		InFrontOfTheCanvas: function FileLibrariesPanel() {
			const source = useFileLibraries()
			return (
				<LibrariesPanel
					source={source}
					getBrowseGroups={() => getPackBrowseGroups(source, 'my-workspace')}
				/>
			)
		},
		ContextMenu: function FileContextMenu(props) {
			return (
				<DefaultContextMenu {...props}>
					<AddToLibraryMenuItem source={useFileLibraries()} />
					<DefaultContextMenuContent />
				</DefaultContextMenu>
			)
		},
		QuickActions: LibrariesQuickActions,
	}
}
