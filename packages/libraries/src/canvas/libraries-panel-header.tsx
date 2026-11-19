import type { ReactNode } from 'react'
import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	useEditor,
	useReadonly,
	useTranslation,
	useValue,
} from 'tldraw'
import { NewLibraryIcon } from '../ui/library-icon'
import { LibraryMenu } from '../ui/library-menu'
import { renamingLibraryId } from './state'

const messages = defineMessages({
	title: { id: 'libraries.title', defaultMessage: 'Libraries' },
})

/**
 * Creates a library from the {@link LibrariesPanel}. When the source has two or more owners, it
 * creates one for a tab's owner: the open tab's in the header, and each tab's own in its
 * {@link NoLibraries}.
 * @public
 */
export interface NewLibraryAction {
	/** "New library", or "New library in …" naming the owner. */
	label: string
	onCreate(): void
}

/** @public */
export interface LibrariesPanelHeaderProps {
	/** For the open tab's owner. Left out when the source doesn't allow creating a library there. */
	newLibrary?: NewLibraryAction
	/** The host's items for the panel's ⋯ menu, from {@link LibrariesPanelProps.menuItems}. */
	menuItems?: ReactNode
}

/**
 * The {@link LibrariesPanel}'s header: its title, a "New library" button and a ⋯ menu. The default
 * for {@link LibrariesComponents.LibrariesPanelHeader}.
 * @public @react
 */
export function LibrariesPanelHeader({ newLibrary, menuItems }: LibrariesPanelHeaderProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const isReadonly = useReadonly()
	const renaming = useValue('renaming library', () => renamingLibraryId.get(editor) !== null, [
		editor,
	])

	return (
		<header className="tlui-libraries-panel__header">
			<span className="tlui-libraries-panel__title">{msg(messages.title)}</span>
			<div className="tlui-libraries-panel__header-actions">
				{newLibrary && !isReadonly && (
					<TldrawUiButton
						type="icon"
						tooltip={newLibrary.label}
						title={newLibrary.label}
						onClick={newLibrary.onCreate}
					>
						<TldrawUiButtonIcon icon={<NewLibraryIcon />} />
					</TldrawUiButton>
				)}
				{/* Hidden while renaming: a closing menu hands focus back to its trigger, which would blur
				    the new library's name input straight away. */}
				{!renaming && <LibraryMenu id="libraries-panel-menu">{menuItems}</LibraryMenu>}
			</div>
		</header>
	)
}
