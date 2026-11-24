import type { ReactNode } from 'react'
import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuGroup,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	useEditor,
	useTranslation,
	useValue,
} from 'tldraw'
import { MenuItem } from '../ui/menu-items'
import type { LibrariesPanelHeaderCreate } from './libraries-panel-header'
import { renamingLibraryId } from './state'

const messages = defineMessages({
	createNew: { id: 'libraries.panel.create-new-library', defaultMessage: 'Create new library' },
})

/**
 * The link at the end of the panel's libraries that creates a library, picking its owner first when
 * there's a choice.
 */
export function CreateLibraryButton({ create }: { create: LibrariesPanelHeaderCreate }) {
	const editor = useEditor()
	const msg = useTranslation()
	const renaming = useValue('renaming library', () => renamingLibraryId.get(editor) !== null, [
		editor,
	])
	const label = msg(messages.createNew)
	const button = (onClick?: () => void) => (
		<TldrawUiButton
			type="primary"
			className="tlui-libraries-panel__create"
			title={label}
			disabled={renaming}
			onClick={onClick}
		>
			<TldrawUiButtonLabel>{label}</TldrawUiButtonLabel>
			<TldrawUiButtonIcon icon="plus" small />
		</TldrawUiButton>
	)

	const endLink = (link: ReactNode) => <div className="tlui-libraries-panel__end-link">{link}</div>

	if (renaming) return endLink(button())
	if (create.owners.length <= 1) return endLink(button(() => create.onCreate(create.owners[0]?.id)))

	return endLink(
		<TldrawUiDropdownMenuRoot id="libraries-create-library">
			<TldrawUiDropdownMenuTrigger>{button()}</TldrawUiDropdownMenuTrigger>
			<TldrawUiDropdownMenuContent className="tlui-libraries-menu" side="top" align="center">
				<TldrawUiDropdownMenuGroup>
					{create.owners.map((owner) => (
						<MenuItem key={owner.id} label={owner.name} onClick={() => create.onCreate(owner.id)} />
					))}
				</TldrawUiDropdownMenuGroup>
			</TldrawUiDropdownMenuContent>
		</TldrawUiDropdownMenuRoot>
	)
}
