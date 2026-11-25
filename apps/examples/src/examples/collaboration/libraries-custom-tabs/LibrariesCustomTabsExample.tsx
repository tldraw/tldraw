import {
	CompositeLibrarySource,
	InMemoryLibrarySource,
	type LibrariesComponents,
	LibrariesPanel,
	librariesPanelOpen,
	LibrariesQuickActions,
	LibrarySectionHeader,
	type LibrarySectionHeaderProps,
	LibraryTabLabel,
	type LibraryTabLabelProps,
	type NoLibrariesProps,
} from '@tldraw/libraries'
import {
	TLComponents,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiIcon,
	useValue,
} from 'tldraw'
import '@tldraw/libraries/libraries.css'
import 'tldraw/tldraw.css'
import { HomeIcon, PeopleIcon } from '../../../libraries-fixtures/owner-icons'
import { PACKS, packSource } from '../../../libraries-fixtures/packs'
import './libraries-custom-tabs.css'

const source = new CompositeLibrarySource({
	id: 'libraries-custom-tabs',
	defaultOwnerId: 'personal',
	parts: [
		{
			owner: { id: 'team', name: 'Team', icon: <PeopleIcon /> },
			source: packSource('libraries-custom-tabs-team', [PACKS.wireframing, PACKS.diagramming], {
				can: () => false,
			}),
		},
		{
			owner: { id: 'personal', name: 'Personal', icon: <HomeIcon /> },
			source: new InMemoryLibrarySource({ id: 'libraries-custom-tabs-personal' }),
		},
	],
})

// [1]
function TabLabelWithCount(props: LibraryTabLabelProps) {
	return (
		<>
			<LibraryTabLabel {...props} />
			<span className="libraries-custom-tabs-count">{props.libraries.length}</span>
		</>
	)
}

// [2]
function SectionHeaderWithCount(props: LibrarySectionHeaderProps) {
	const { source, library, collapsed, onToggleCollapsed, menu, isRenaming } = props
	const count = useValue('library item count', () => source.getItems(library.id).length, [
		source,
		library.id,
	])
	if (isRenaming) return <LibrarySectionHeader {...props} />
	return (
		<header className="libraries-custom-tabs-section-header">
			<button type="button" aria-expanded={!collapsed} onClick={onToggleCollapsed}>
				<TldrawUiIcon icon={collapsed ? 'chevron-right' : 'chevron-down'} label="" small />
				<span>{library.name}</span>
				<span className="libraries-custom-tabs-count">{count}</span>
			</button>
			{menu}
		</header>
	)
}

// [3]
function WelcomeToLibraries({ owner, newLibrary }: NoLibrariesProps) {
	return (
		<div className="libraries-custom-tabs-empty">
			<strong>{owner ? `Nothing in ${owner.name} yet` : 'No libraries yet'}</strong>
			<p>Libraries keep the shapes you reuse, ready to drag onto any board.</p>
			{newLibrary && (
				<TldrawUiButton type="primary" onClick={newLibrary.onCreate}>
					<TldrawUiButtonLabel>Create your first library</TldrawUiButtonLabel>
				</TldrawUiButton>
			)}
		</div>
	)
}

const librariesComponents: LibrariesComponents = {
	LibraryTabLabel: TabLabelWithCount,
	LibrarySectionHeader: SectionHeaderWithCount,
	NoLibraries: WelcomeToLibraries,
}

const components: TLComponents = {
	InFrontOfTheCanvas: () => <LibrariesPanel source={source} components={librariesComponents} />,
	QuickActions: LibrariesQuickActions,
}

export default function LibrariesCustomTabsExample() {
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
A `LibraryTabLabel` override gets the tab's owner and its libraries. This one renders the default
label followed by the number of libraries.

[2]
A `LibrarySectionHeader` override gets the library, whether it's folded, and the library's ⋯ menu
to place. It hands back to the default header while the library is being renamed, so the rename
input still works.

[3]
`NoLibraries` shows when a tab has no libraries yet. `newLibrary` is there when the user may
create one, and creates it for the tab's owner.
*/
