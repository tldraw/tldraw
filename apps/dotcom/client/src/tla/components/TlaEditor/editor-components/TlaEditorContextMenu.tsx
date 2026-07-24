// The SDK context menu with one change: divider pages (#9445) are excluded
// from the "Move to page" submenu. TlaEditorContextMenuContent is a copy of
// the SDK's DefaultContextMenuContent, and TlaMoveToPageMenu a copy of the
// SDK's MoveToPageMenu (packages/tldraw/src/lib/ui/components/menu-items.tsx)
// with the divider filter added. Diff against those when updating.
import {
	ArrangeMenuSubmenu,
	ClipboardMenuGroup,
	ConversionsMenuGroup,
	CursorChatItem,
	DefaultContextMenu,
	EditMenuSubmenu,
	ReorderMenuSubmenu,
	SelectAllMenuItem,
	TLPageId,
	TLUiContextMenuProps,
	TldrawUiMenuActionItem,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useEditor,
	useReadonly,
	useShowCollaborationUi,
	useToasts,
	useUiEvents,
	useUnlockedSelectedShapesCount,
	useValue,
} from 'tldraw'
import { isPageDivider } from '../../../utils/pageDividers'

export function TlaEditorContextMenu(props: TLUiContextMenuProps) {
	return (
		<DefaultContextMenu {...props}>
			<TlaEditorContextMenuContent />
		</DefaultContextMenu>
	)
}

function TlaEditorContextMenuContent() {
	const editor = useEditor()
	const showCollaborationUi = useShowCollaborationUi()

	const isSinglePageMode = useValue('isSinglePageMode', () => editor.options.maxPages <= 1, [
		editor,
	])

	return (
		<>
			{showCollaborationUi && <CursorChatItem />}
			<TldrawUiMenuGroup id="modify">
				<EditMenuSubmenu />
				<ArrangeMenuSubmenu />
				<ReorderMenuSubmenu />
				{!isSinglePageMode && <TlaMoveToPageMenu />}
			</TldrawUiMenuGroup>
			<ClipboardMenuGroup />
			<ConversionsMenuGroup />
			<TldrawUiMenuGroup id="select-all">
				<SelectAllMenuItem />
			</TldrawUiMenuGroup>
		</>
	)
}

function TlaMoveToPageMenu() {
	const editor = useEditor()
	// Unlike the SDK menu, divider pages are filtered out of the list.
	const pages = useValue(
		'pages',
		() => editor.getPages().filter((page) => !isPageDivider(editor, page)),
		[editor]
	)
	const currentPageId = useValue('current page id', () => editor.getCurrentPageId(), [editor])
	const { addToast } = useToasts()
	const trackEvent = useUiEvents()
	const isReadonlyMode = useReadonly()
	const oneSelected = useUnlockedSelectedShapesCount(1)

	if (!oneSelected) return null
	if (isReadonlyMode) return null

	return (
		<TldrawUiMenuSubmenu id="move-to-page" label="context-menu.move-to-page" size="small">
			<TldrawUiMenuGroup id="pages">
				{pages.map((page) => (
					<TldrawUiMenuItem
						id={page.id}
						key={page.id}
						disabled={currentPageId === page.id}
						label={page.name.length > 30 ? `${page.name.slice(0, 30)}…` : page.name}
						onSelect={() => {
							editor.markHistoryStoppingPoint('move_shapes_to_page')
							editor.moveShapesToPage(editor.getSelectedShapeIds(), page.id as TLPageId)

							const toPage = editor.getPage(page.id)

							if (toPage) {
								// TODO: dotcom i18n — copied verbatim from the SDK, which
								// hardcodes these strings in English too.
								addToast({
									title: 'Changed page',
									description: `Moved to ${toPage.name}.`,
									actions: [
										{
											label: 'Go back',
											type: 'primary',
											onClick: () => {
												editor.markHistoryStoppingPoint('change-page')
												editor.setCurrentPage(currentPageId)
											},
										},
									],
								})
							}
							trackEvent('move-to-page', { source: 'context-menu' })
						}}
					/>
				))}
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="new-page">
				<TldrawUiMenuActionItem actionId="move-to-new-page" />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}
