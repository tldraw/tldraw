// Fork of packages/tldraw/src/lib/ui/components/PageMenu/PageItemSubmenu.tsx
// adding divider pages (#9445): divider rows offer only move and delete, and
// deleting the current page steps to the nearest non-divider page. Diff
// against the SDK file when updating.
import { useCallback } from 'react'
import {
	PageRecordType,
	TLPageId,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	track,
	useEditor,
	useTranslation,
	useUiEvents,
} from 'tldraw'
import { getNearestNonDividerPageId } from '../../../utils/pageDividers'
import { onMovePage } from './edit-pages-shared'

export interface TlaPageItemSubmenuProps {
	index: number
	item: { id: string; name: string }
	listSize: number
	isDivider?: boolean
	onRename?(): void
}

export const TlaPageItemSubmenu = track(function TlaPageItemSubmenu({
	index,
	listSize,
	item,
	isDivider,
	onRename,
}: TlaPageItemSubmenuProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const trackEvent = useUiEvents()

	const onDuplicate = useCallback(() => {
		editor.markHistoryStoppingPoint('creating page')
		const newId = PageRecordType.createId()
		editor.duplicatePage(item.id as TLPageId, newId)
		trackEvent('duplicate-page', { source: 'page-menu' })
	}, [editor, item, trackEvent])

	const onMoveUp = useCallback(() => {
		onMovePage(editor, item.id as TLPageId, index, index - 1, trackEvent)
	}, [editor, item, index, trackEvent])

	const onMoveDown = useCallback(() => {
		onMovePage(editor, item.id as TLPageId, index, index + 1, trackEvent)
	}, [editor, item, index, trackEvent])

	const onDelete = useCallback(() => {
		editor.run(() => {
			editor.markHistoryStoppingPoint('deleting page')
			// When deleting the current page, the editor falls back to an
			// adjacent page, which could be a divider. Step to the nearest
			// regular page first so the user never lands on a divider.
			if (editor.getCurrentPageId() === item.id) {
				const nearestId = getNearestNonDividerPageId(editor, item.id as TLPageId)
				if (nearestId) editor.setCurrentPage(nearestId)
			}
			editor.deletePage(item.id as TLPageId)
		})
		trackEvent('delete-page', { source: 'page-menu' })
	}, [editor, item, trackEvent])

	return (
		<TldrawUiDropdownMenuRoot id={`page item submenu ${index}`}>
			<TldrawUiDropdownMenuTrigger>
				<TldrawUiButton
					type="icon"
					tooltip={msg('page-menu.submenu.title')}
					title={msg('page-menu.submenu.title')}
					data-testid="page-menu.item-submenu"
				>
					<TldrawUiButtonIcon icon="dots-vertical" small />
				</TldrawUiButton>
			</TldrawUiDropdownMenuTrigger>
			<TldrawUiDropdownMenuContent side="bottom" align="start" alignOffset={0} sideOffset={0}>
				<TldrawUiMenuContextProvider type="menu" sourceId="page-menu">
					<TldrawUiMenuGroup id="modify">
						{!isDivider && onRename && (
							<TldrawUiMenuItem id="rename" label="page-menu.submenu.rename" onSelect={onRename} />
						)}
						{!isDivider && (
							<TldrawUiMenuItem
								id="duplicate"
								label="page-menu.submenu.duplicate-page"
								onSelect={onDuplicate}
								disabled={listSize >= editor.options.maxPages}
							/>
						)}
						{index > 0 && (
							<TldrawUiMenuItem
								id="move-up"
								onSelect={onMoveUp}
								label="page-menu.submenu.move-up"
							/>
						)}
						{index < listSize - 1 && (
							<TldrawUiMenuItem
								id="move-down"
								label="page-menu.submenu.move-down"
								onSelect={onMoveDown}
							/>
						)}
					</TldrawUiMenuGroup>
					{listSize > 1 && (
						<TldrawUiMenuGroup id="delete">
							<TldrawUiMenuItem id="delete" onSelect={onDelete} label="page-menu.submenu.delete" />
						</TldrawUiMenuGroup>
					)}
				</TldrawUiMenuContextProvider>
			</TldrawUiDropdownMenuContent>
		</TldrawUiDropdownMenuRoot>
	)
})
