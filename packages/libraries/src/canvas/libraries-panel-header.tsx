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
import { LibraryMenu } from '../ui/library-menu'
import { renamingLibraryId } from './state'

const messages = defineMessages({
	title: { id: 'libraries.title', defaultMessage: 'Libraries' },
})

export interface LibrariesPanelHeaderNewLibrary {
	label: string
	onCreate(): void
}

export function LibrariesPanelHeader({
	newLibrary,
	menuItems,
}: {
	newLibrary?: LibrariesPanelHeaderNewLibrary
	menuItems?: ReactNode
}) {
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
						<TldrawUiButtonIcon icon="library-add" />
					</TldrawUiButton>
				)}
				{/* Hidden while renaming: a closing menu hands focus back to its trigger, which would blur
				    the new library's name input straight away. */}
				{!renaming && <LibraryMenu id="libraries-panel-menu">{menuItems}</LibraryMenu>}
			</div>
		</header>
	)
}
