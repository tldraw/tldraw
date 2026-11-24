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
	create: { id: 'libraries.panel.create-library', defaultMessage: 'Create library' },
})

/** The button in Browse's footer that creates a library, picking its owner first when there's a choice. */
export function CreateLibraryButton({ create }: { create: LibrariesPanelHeaderCreate }) {
	const editor = useEditor()
	const msg = useTranslation()
	const renaming = useValue('renaming library', () => renamingLibraryId.get(editor) !== null, [
		editor,
	])
	const label = msg(messages.create)
	const button = (onClick?: () => void) => (
		<TldrawUiButton
			type="normal"
			className="tlui-libraries-browse__create"
			title={label}
			disabled={renaming}
			onClick={onClick}
		>
			<TldrawUiButtonLabel>{label}</TldrawUiButtonLabel>
			<TldrawUiButtonIcon icon="plus" small />
		</TldrawUiButton>
	)

	if (renaming) return button()
	if (create.owners.length <= 1) return button(() => create.onCreate(create.owners[0]?.id))

	return (
		<TldrawUiDropdownMenuRoot id="libraries-create-library">
			<TldrawUiDropdownMenuTrigger>{button()}</TldrawUiDropdownMenuTrigger>
			<TldrawUiDropdownMenuContent className="tlui-libraries-menu" side="top" align="end">
				<TldrawUiDropdownMenuGroup>
					{create.owners.map((owner) => (
						<MenuItem key={owner.id} label={owner.name} onClick={() => create.onCreate(owner.id)} />
					))}
				</TldrawUiDropdownMenuGroup>
			</TldrawUiDropdownMenuContent>
		</TldrawUiDropdownMenuRoot>
	)
}
