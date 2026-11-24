import type { ReactNode } from 'react'
import { defineMessages, useEditor, useTranslation, useValue } from 'tldraw'
import type { TLLibraryOwner } from '../lib/LibrarySource'
import { LibraryMenu } from '../ui/library-menu'
import { MenuItem, MenuSubmenu } from '../ui/menu-items'
import { renamingLibraryId } from './state'

const messages = defineMessages({
	title: { id: 'libraries.title', defaultMessage: 'Libraries' },
	createLibrary: { id: 'libraries.panel.create-library', defaultMessage: 'Create a library' },
	browseLibraries: { id: 'libraries.panel.browse-libraries', defaultMessage: 'Browse libraries' },
})

/**
 * Where the {@link LibrariesPanel} can create a library.
 * @public
 */
export interface LibrariesPanelHeaderCreate {
	/** Where a new library can go. With fewer than two, it goes to the one, or the default. */
	owners: TLLibraryOwner[]
	onCreate(ownerId?: string): void
}

/** @public */
export interface LibrariesPanelHeaderProps {
	/** The host's items for the panel's ⋯ menu, from {@link LibrariesPanelProps.menuItems}. */
	menuItems?: ReactNode
	/** For "Create a library". Left out when the source doesn't allow creating a library. */
	create?: LibrariesPanelHeaderCreate
	/** For "Browse libraries". Left out when there are no libraries to browse. */
	onBrowse?(): void
}

/**
 * The {@link LibrariesPanel}'s header: its title and a ⋯ menu to create a library, browse libraries
 * and pick the host's own items. The default for {@link LibrariesComponents.LibrariesPanelHeader}.
 * @public @react
 */
export function LibrariesPanelHeader({ menuItems, create, onBrowse }: LibrariesPanelHeaderProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const renaming = useValue('renaming library', () => renamingLibraryId.get(editor) !== null, [
		editor,
	])
	const hasItems = !!create || !!onBrowse || !!menuItems

	return (
		<header className="tlui-libraries-panel__header">
			<span className="tlui-libraries-panel__title">{msg(messages.title)}</span>
			<div className="tlui-libraries-panel__header-actions">
				{/* Hidden while renaming: a closing menu hands focus back to its trigger, which would blur
				    the new library's name input straight away. */}
				{!renaming && hasItems && (
					<LibraryMenu id="libraries-panel-menu">
						{create && <CreateLibraryItem create={create} />}
						{onBrowse && <MenuItem label={msg(messages.browseLibraries)} onClick={onBrowse} />}
						{menuItems}
					</LibraryMenu>
				)}
			</div>
		</header>
	)
}

function CreateLibraryItem({ create }: { create: LibrariesPanelHeaderCreate }) {
	const msg = useTranslation()
	const label = msg(messages.createLibrary)

	if (create.owners.length <= 1) {
		return <MenuItem label={label} onClick={() => create.onCreate(create.owners[0]?.id)} />
	}

	return (
		<MenuSubmenu id="libraries-panel-menu-create" label={label}>
			{create.owners.map((owner) => (
				<MenuItem key={owner.id} label={owner.name} onClick={() => create.onCreate(owner.id)} />
			))}
		</MenuSubmenu>
	)
}
