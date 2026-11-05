import {
	DefaultActionsMenu,
	defineMessages,
	TldrawUiButtonIcon,
	TldrawUiToolbarButton,
	useEditor,
	useTranslation,
	useValue,
	type TLUiActionsMenuProps,
} from 'tldraw'
import { collectionsPanelOpen, toggleCollectionsPanel } from './state'

const messages = defineMessages({
	title: { id: 'collections.title', defaultMessage: 'Collections' },
})

/**
 * An `ActionsMenu` override: tldraw's actions menu followed by a button that opens and closes the
 * {@link CollectionsPanel}. tldraw renders the actions menu at the end of the quick actions, so the
 * button sits there too: in the menu panel on wide screens, and in the toolbar on narrow ones.
 *
 * @example
 * ```tsx
 * <Tldraw components={{ ActionsMenu: CollectionsActionsMenu }} />
 * ```
 * @public @react
 */
export function CollectionsActionsMenu(props: TLUiActionsMenuProps) {
	return (
		<>
			<DefaultActionsMenu {...props} />
			<CollectionsToolbarButton />
		</>
	)
}

function CollectionsToolbarButton() {
	const editor = useEditor()
	const msg = useTranslation()
	const open = useValue('collections panel open', () => collectionsPanelOpen.get(editor), [editor])

	return (
		<TldrawUiToolbarButton
			type="icon"
			aria-pressed={open}
			isActive={open}
			title={msg(messages.title)}
			onClick={() => toggleCollectionsPanel(editor)}
		>
			<TldrawUiButtonIcon icon="bookmark" small />
		</TldrawUiToolbarButton>
	)
}
