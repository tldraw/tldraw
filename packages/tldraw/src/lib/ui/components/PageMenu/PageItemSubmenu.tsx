import * as _DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MAX_PAGES, PageRecordType, TLPageId, track, useEditor } from '@tldraw/editor'
import { useCallback } from 'react'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { Button } from '../primitives/Button'
import {
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuRoot,
	DropdownMenuTrigger,
} from '../primitives/DropdownMenu'
import { onMovePage } from './edit-pages-shared'

export interface PageItemSubmenuProps {
	index: number
	item: { id: string; name: string }
	listSize: number
	onRename?: () => void
}

export const PageItemSubmenu = track(function PageItemSubmenu({
	index,
	listSize,
	item,
	onRename,
}: PageItemSubmenuProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const pages = editor.getPages()

	const onDuplicate = useCallback(() => {
		editor.mark('creating page')
		const newId = PageRecordType.createId()
		editor.duplicatePage(item.id as TLPageId, newId)
	}, [editor, item])

	const onMoveUp = useCallback(() => {
		onMovePage(editor, item.id as TLPageId, index, index - 1)
	}, [editor, item, index])

	const onMoveDown = useCallback(() => {
		onMovePage(editor, item.id as TLPageId, index, index + 1)
	}, [editor, item, index])

	const onDelete = useCallback(() => {
		editor.mark('deleting page')
		editor.deletePage(item.id as TLPageId)
	}, [editor, item])

	return (
		<DropdownMenuRoot id={`page item submenu ${index}`}>
			<DropdownMenuTrigger>
				<Button type="icon" title={msg('page-menu.submenu.title')} icon="dots-vertical" />
			</DropdownMenuTrigger>
			<DropdownMenuContent alignOffset={0}>
				<DropdownMenuGroup>
					{onRename && (
						<_DropdownMenu.Item dir="ltr" onSelect={onRename} asChild>
							<Button type="menu" label="page-menu.submenu.rename" />
						</_DropdownMenu.Item>
					)}
					<_DropdownMenu.Item
						dir="ltr"
						onSelect={onDuplicate}
						disabled={pages.length >= MAX_PAGES}
						asChild
					>
						<Button type="menu" label="page-menu.submenu.duplicate-page" />
					</_DropdownMenu.Item>
					{index > 0 && (
						<_DropdownMenu.Item dir="ltr" onSelect={onMoveUp} asChild>
							<Button type="menu" label="page-menu.submenu.move-up" />
						</_DropdownMenu.Item>
					)}
					{index < listSize - 1 && (
						<_DropdownMenu.Item dir="ltr" onSelect={onMoveDown} asChild>
							<Button type="menu" label="page-menu.submenu.move-down" />
						</_DropdownMenu.Item>
					)}
				</DropdownMenuGroup>
				{listSize > 1 && (
					<DropdownMenuGroup>
						<_DropdownMenu.Item dir="ltr" onSelect={onDelete} asChild>
							<Button type="menu" label="page-menu.submenu.delete" />
						</_DropdownMenu.Item>
					</DropdownMenuGroup>
				)}
			</DropdownMenuContent>
		</DropdownMenuRoot>
	)
})
