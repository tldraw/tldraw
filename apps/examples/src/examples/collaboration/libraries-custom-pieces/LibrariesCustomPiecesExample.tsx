import {
	collapsedLibraryIds,
	type EmptyLibraryProps,
	type LibrariesComponents,
	LibrariesPanel,
	LibrariesPanelHeader,
	type LibrariesPanelHeaderProps,
	librariesPanelOpen,
	LibrariesQuickActions,
	LibraryMenuItem,
	LibrarySectionHeader,
	type LibrarySectionHeaderProps,
	useLibraries,
} from '@tldraw/libraries'
import { TLComponents, Tldraw, TldrawUiIcon, useEditor, useValue } from 'tldraw'
import '@tldraw/libraries/libraries.css'
import 'tldraw/tldraw.css'
import { PACKS, packSource } from '../../../libraries-fixtures/packs'
import './libraries-custom-pieces.css'

const source = packSource(
	'libraries-custom-pieces',
	[PACKS.wireframing, { id: 'team-picks', name: 'Team picks', version: 1, items: [] }],
	{ can: (action) => action !== 'addItem' }
)

// [1]
function HeaderWithFoldAll(props: LibrariesPanelHeaderProps) {
	const editor = useEditor()
	const libraryIds = useLibraries(source).map((library) => library.id)
	return (
		<LibrariesPanelHeader
			{...props}
			menuItems={
				<>
					<LibraryMenuItem
						label="Fold all"
						onClick={() => collapsedLibraryIds.set(editor, libraryIds)}
					/>
					<LibraryMenuItem label="Unfold all" onClick={() => collapsedLibraryIds.set(editor, [])} />
					{props.menuItems}
				</>
			}
		/>
	)
}

// [2]
function SectionHeaderWithCount(props: LibrarySectionHeaderProps) {
	const { library, collapsed, onToggleCollapsed, menu, isRenaming } = props
	const count = useValue('library item count', () => source.getItems(library.id).length, [
		library.id,
	])
	if (isRenaming) return <LibrarySectionHeader {...props} />
	return (
		<header className="libraries-custom-pieces-section-header">
			<button type="button" aria-expanded={!collapsed} onClick={onToggleCollapsed}>
				<TldrawUiIcon icon={collapsed ? 'chevron-right' : 'chevron-down'} label="" small />
				<span>{library.name}</span>
				<span className="libraries-custom-pieces-count">{count}</span>
			</button>
			{menu}
		</header>
	)
}

// [3]
function EmptyLibraryNote({ library }: EmptyLibraryProps) {
	return (
		<div className="libraries-custom-pieces-empty">
			<p>Nothing in {library.name} yet. Your team adds to it from tldraw.com.</p>
		</div>
	)
}

function WelcomeToLibraries() {
	return (
		<div className="libraries-custom-pieces-empty">
			<strong>No libraries yet</strong>
			<p>Libraries keep the shapes you reuse, ready to drag onto any board.</p>
		</div>
	)
}

const librariesComponents: LibrariesComponents = {
	LibrariesPanelHeader: HeaderWithFoldAll,
	LibrarySectionHeader: SectionHeaderWithCount,
	EmptyLibrary: EmptyLibraryNote,
	NoLibraries: WelcomeToLibraries,
}

const components: TLComponents = {
	InFrontOfTheCanvas: () => <LibrariesPanel source={source} components={librariesComponents} />,
	QuickActions: LibrariesQuickActions,
}

export default function LibrariesCustomPiecesExample() {
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
A `LibrariesPanelHeader` override gets the header's props, including the items its ⋯ menu shows.
This one adds "Fold all" and "Unfold all" before them, setting `collapsedLibraryIds`.

[2]
A `LibrarySectionHeader` override gets the library, whether it's folded, and the library's menu to
place inside it: the menu has no button and opens over the header on a right-click. It hands back
to the default header while the library is being renamed, so the rename input still works.

[3]
`EmptyLibrary` shows in a library with no items, and `NoLibraries` when there are no libraries.
*/
