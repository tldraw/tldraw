import { defineMessages, PageRecordType, TLPageId, track, useEditor } from '@tldraw/editor'
import { useCallback } from 'react'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'
import { TldrawUiMenuGroup } from '../primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
} from '../primitives/TldrawUiDropdownMenu'
import { onMovePage } from './edit-pages-shared'

// Declared here so the English sits with the UI that shows it, and so the extractor can see it.
const messages = defineMessages({
	pageMenuSubmenuDelete: { id: 'page-menu.submenu.delete', defaultMessage: 'Delete' },
	pageMenuSubmenuDuplicatePage: {
		id: 'page-menu.submenu.duplicate-page',
		defaultMessage: 'Duplicate',
	},
	pageMenuSubmenuMoveDown: { id: 'page-menu.submenu.move-down', defaultMessage: 'Move down' },
	pageMenuSubmenuMoveUp: { id: 'page-menu.submenu.move-up', defaultMessage: 'Move up' },
	pageMenuSubmenuRename: { id: 'page-menu.submenu.rename', defaultMessage: 'Rename' },
	pageMenuSubmenuTitle: { id: 'page-menu.submenu.title', defaultMessage: 'Menu' },
})
/** @public */
export interface PageItemSubmenuProps {
	index: number
	item: { id: string; name: string }
	listSize: number
	onRename?(): void
}
/** @public */
export const PageItemSubmenu = track(function PageItemSubmenu({
	index,
	listSize,
	item,
	onRename,
}: PageItemSubmenuProps) {
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
		editor.markHistoryStoppingPoint('deleting page')
		editor.deletePage(item.id as TLPageId)
		trackEvent('delete-page', { source: 'page-menu' })
	}, [editor, item, trackEvent])

	return (
		<TldrawUiDropdownMenuRoot id={`page item submenu ${index}`}>
			<TldrawUiDropdownMenuTrigger>
				<TldrawUiButton
					type="icon"
					tooltip={msg(messages.pageMenuSubmenuTitle.id)}
					title={msg(messages.pageMenuSubmenuTitle.id)}
					data-testid="page-menu.item-submenu"
				>
					<TldrawUiButtonIcon icon="dots-vertical" small />
				</TldrawUiButton>
			</TldrawUiDropdownMenuTrigger>
			<TldrawUiDropdownMenuContent side="bottom" align="start" alignOffset={0} sideOffset={0}>
				<TldrawUiMenuContextProvider type="menu" sourceId="page-menu">
					<TldrawUiMenuGroup id="modify">
						{onRename && (
							<TldrawUiMenuItem
								id="rename"
								label={messages.pageMenuSubmenuRename.id}
								onSelect={onRename}
							/>
						)}
						<TldrawUiMenuItem
							id="duplicate"
							label={messages.pageMenuSubmenuDuplicatePage.id}
							onSelect={onDuplicate}
							disabled={listSize >= editor.options.maxPages}
						/>
						{index > 0 && (
							<TldrawUiMenuItem
								id="move-up"
								onSelect={onMoveUp}
								label={messages.pageMenuSubmenuMoveUp.id}
							/>
						)}
						{index < listSize - 1 && (
							<TldrawUiMenuItem
								id="move-down"
								label={messages.pageMenuSubmenuMoveDown.id}
								onSelect={onMoveDown}
							/>
						)}
					</TldrawUiMenuGroup>
					{listSize > 1 && (
						<TldrawUiMenuGroup id="delete">
							<TldrawUiMenuItem
								id="delete"
								onSelect={onDelete}
								label={messages.pageMenuSubmenuDelete.id}
							/>
						</TldrawUiMenuGroup>
					)}
				</TldrawUiMenuContextProvider>
			</TldrawUiDropdownMenuContent>
		</TldrawUiDropdownMenuRoot>
	)
})
