import {
	CompositeLibrarySource,
	InMemoryLibrarySource,
	type LibrariesComponents,
	LibrarySectionHeader,
	type LibrarySectionHeaderProps,
} from '@tldraw/libraries'
import { TldrawUiIcon, useValue } from 'tldraw'
import type { Showing } from '../libraries-example'
import { HomeIcon, PeopleIcon } from '../libraries-owner-icons'
import { PACKS, packSource } from './pack-source'

const source = new CompositeLibrarySource({
	id: 'showcase-tabs',
	defaultOwnerId: 'personal',
	parts: [
		{
			owner: { id: 'team', name: 'Team', icon: <PeopleIcon /> },
			source: packSource('showcase-team', [PACKS.wireframing, PACKS.diagramming], {
				can: () => false,
			}),
		},
		{
			owner: { id: 'personal', name: 'Personal', icon: <HomeIcon /> },
			source: new InMemoryLibrarySource({ id: 'showcase-personal' }),
		},
	],
})

function SectionHeaderWithCount(props: LibrarySectionHeaderProps) {
	const { source, library, collapsed, onToggleCollapsed, menu, isRenaming } = props
	const count = useValue('library item count', () => source.getItems(library.id).length, [
		source,
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

function WelcomeToLibraries() {
	return (
		<div className="libraries-showcase-empty">
			<strong>No libraries yet</strong>
			<p>Libraries keep the shapes you reuse, ready to drag onto any board.</p>
		</div>
	)
}

const components: LibrariesComponents = {
	LibrarySectionHeader: SectionHeaderWithCount,
	NoLibraries: WelcomeToLibraries,
}

export const customTabsAndStates: Showing = { source, components }
