import {
	collapsedLibraryIds,
	type EmptyLibraryProps,
	type LibrariesComponents,
	LibrariesPanelHeader,
	type LibrariesPanelHeaderProps,
	LibraryMenuItem,
	LibrarySectionHeader,
	type LibrarySectionHeaderProps,
	useLibraries,
} from '@tldraw/libraries'
import { TldrawUiIcon, useEditor, useValue } from 'tldraw'
import type { Showing } from '../libraries-example'
import { PACKS, packSource } from './pack-source'

const source = packSource(
	'showcase-custom-pieces',
	[PACKS.wireframing, { id: 'team-picks', name: 'Team picks', version: 1, items: [] }],
	{ can: (action) => action !== 'addItem' }
)

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

function SectionHeaderWithCount(props: LibrarySectionHeaderProps) {
	const { library, collapsed, onToggleCollapsed, menu, isRenaming } = props
	const count = useValue('library item count', () => source.getItems(library.id).length, [
		library.id,
	])
	if (isRenaming) return <LibrarySectionHeader {...props} />
	return (
		<header className="libraries-showcase-section-header">
			<button type="button" aria-expanded={!collapsed} onClick={onToggleCollapsed}>
				<TldrawUiIcon icon={collapsed ? 'chevron-right' : 'chevron-down'} label="" small />
				<span>{library.name}</span>
				<span className="libraries-showcase-count">{count}</span>
			</button>
			{menu}
		</header>
	)
}

function EmptyLibraryNote({ library }: EmptyLibraryProps) {
	return (
		<div className="libraries-showcase-empty">
			<p>Nothing in {library.name} yet. Your team adds to it from tldraw.com.</p>
		</div>
	)
}

function WelcomeToLibraries() {
	return (
		<div className="libraries-showcase-empty">
			<strong>No libraries yet</strong>
			<p>Libraries keep the shapes you reuse, ready to drag onto any board.</p>
		</div>
	)
}

const components: LibrariesComponents = {
	LibrariesPanelHeader: HeaderWithFoldAll,
	LibrarySectionHeader: SectionHeaderWithCount,
	EmptyLibrary: EmptyLibraryNote,
	NoLibraries: WelcomeToLibraries,
}

export const customPieces: Showing = { source, components }
