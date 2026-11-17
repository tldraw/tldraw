import type { ReactNode } from 'react'
import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuGroup,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	useEditor,
	useTranslation,
	useValue,
} from 'tldraw'
import type { TLLibraryOwner } from '../lib/LibrarySource'
import { LibraryMenu } from '../ui/library-menu'
import { MenuItem } from '../ui/menu-items'
import { renamingLibraryId } from './state'

const messages = defineMessages({
	title: { id: 'libraries.title', defaultMessage: 'Libraries' },
	newLibrary: { id: 'libraries.panel.new-library', defaultMessage: 'New library' },
})

/**
 * Creates a library from the {@link LibrariesPanel}.
 * @public
 */
export interface NewLibraryAction {
	/** "New library", or "New library in …" naming the owner. */
	label: string
	onCreate(): void
}

/**
 * Where the {@link LibrariesPanel}'s "New library" button can create a library.
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
	/** For the "New library" button. Left out when the source doesn't allow creating a library. */
	create?: LibrariesPanelHeaderCreate
}

/**
 * The {@link LibrariesPanel}'s header: its title, a "New library" button and a ⋯ menu. The default
 * for {@link LibrariesComponents.LibrariesPanelHeader}.
 * @public @react
 */
export function LibrariesPanelHeader({ menuItems, create }: LibrariesPanelHeaderProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const renaming = useValue('renaming library', () => renamingLibraryId.get(editor) !== null, [
		editor,
	])

	return (
		<header className="tlui-libraries-panel__header">
			<span className="tlui-libraries-panel__title">{msg(messages.title)}</span>
			<div className="tlui-libraries-panel__header-actions">
				{/* Hidden while renaming: a closing menu hands focus back to its trigger, which would blur
				    the new library's name input straight away. */}
				{!renaming && create && <NewLibraryButton create={create} />}
				{!renaming && <LibraryMenu id="libraries-panel-menu">{menuItems}</LibraryMenu>}
			</div>
		</header>
	)
}

function NewLibraryButton({ create }: { create: LibrariesPanelHeaderCreate }) {
	const msg = useTranslation()
	const label = msg(messages.newLibrary)
	const button = (onClick?: () => void) => (
		<TldrawUiButton type="icon" tooltip={label} title={label} onClick={onClick}>
			<TldrawUiButtonIcon icon="plus" small />
		</TldrawUiButton>
	)

	if (create.owners.length <= 1) {
		return button(() => create.onCreate(create.owners[0]?.id))
	}

	return (
		<TldrawUiDropdownMenuRoot id="libraries-new-library">
			<TldrawUiDropdownMenuTrigger>{button()}</TldrawUiDropdownMenuTrigger>
			<TldrawUiDropdownMenuContent className="tlui-libraries-menu" side="bottom" align="end">
				<TldrawUiDropdownMenuGroup>
					{create.owners.map((owner) => (
						<MenuItem key={owner.id} label={owner.name} onClick={() => create.onCreate(owner.id)} />
					))}
				</TldrawUiDropdownMenuGroup>
			</TldrawUiDropdownMenuContent>
		</TldrawUiDropdownMenuRoot>
	)
}
