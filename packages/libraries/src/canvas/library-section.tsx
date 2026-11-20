import { type ButtonHTMLAttributes, useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, useValue, type TLLibrary, type TLLibraryItemId } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { LibraryMenu as DefaultLibraryMenu } from '../ui/library-menu'
import { useLibrariesComponentOverrides } from './libraries-components'
import { LibraryItems } from './library-items'
import { LibrarySectionHeader as DefaultLibrarySectionHeader } from './library-section-header'
import { useLongPress } from './long-press'
import type { PrepareItemContent } from './save-shapes'
import { activeLibraryId, collapsedLibraryIds } from './state'
import { useIsPhone } from './use-is-phone'
import { useItemOrdering } from './use-item-ordering'
import { useLibraryActions } from './use-library-actions'
import { useLibraryCollapsed } from './use-library-collapsed'

/** Unfolds and scrolls into view when it becomes the active library, e.g. from a toast's "Open". */
export function LibrarySection({
	source,
	library,
	getItemProps,
	placeItem,
	prepareItemContent,
}: {
	source: LibrarySource
	library: TLLibrary
	getItemProps(itemId: TLLibraryItemId): ButtonHTMLAttributes<HTMLButtonElement>
	placeItem(itemId: TLLibraryItemId): void
	prepareItemContent?: PrepareItemContent
}) {
	const editor = useEditor()
	const { LibrarySectionHeader = DefaultLibrarySectionHeader, LibraryMenu = DefaultLibraryMenu } =
		useLibrariesComponentOverrides()
	const { isRenaming, onRenameComplete, onRenameCancel, menuActions } = useLibraryActions(
		source,
		library
	)
	const ref = useRef<HTMLElement | null>(null)
	// Also in state, so the tiles can measure once it mounts. The ref stays for the scroll below,
	// which runs before a state update would land.
	const [element, setElement] = useState<HTMLElement | null>(null)
	const setRef = useCallback((el: HTMLElement | null) => {
		ref.current = el
		setElement(el)
	}, [])
	const libraryId = library.id
	const [collapsed, setCollapsed] = useLibraryCollapsed(libraryId)
	const isActive = useValue('library active', () => activeLibraryId.get(editor) === libraryId, [
		editor,
		libraryId,
	])
	useEffect(() => {
		if (!isActive) return
		collapsedLibraryIds.update(editor, (ids) => ids.filter((id) => id !== libraryId))
		if (ref.current) {
			ref.current.scrollIntoView({
				block: 'nearest',
				behavior: editor.user.getAnimationSpeed() > 0 ? 'smooth' : 'auto',
			})
		}
		activeLibraryId.set(editor, null)
	}, [editor, isActive, libraryId])

	const { ordering, reversed, sort } = useItemOrdering(source, libraryId)
	const menuId = `libraries-library-menu-${libraryId}`
	const headerPress = useLongPress(useIsPhone() && !isRenaming && !!LibraryMenu)(() =>
		editor.menus.addOpenMenu(menuId)
	)

	return (
		<section
			ref={setRef}
			className="tlui-libraries-section"
			{...headerPress}
			onPointerDown={(e) => {
				const header = e.currentTarget.firstElementChild
				if (headerPress.onPointerDown && header && header.contains(e.target as Node)) {
					headerPress.onPointerDown(e)
				}
			}}
		>
			{LibrarySectionHeader && (
				<LibrarySectionHeader
					source={source}
					library={library}
					collapsed={collapsed}
					onToggleCollapsed={() => setCollapsed(!collapsed)}
					sort={sort}
					menu={
						!isRenaming &&
						LibraryMenu && (
							<LibraryMenu
								source={source}
								library={library}
								id={menuId}
								sort={sort}
								{...menuActions}
							/>
						)
					}
					isRenaming={isRenaming}
					onRenameComplete={onRenameComplete}
					onRenameCancel={onRenameCancel}
				/>
			)}
			{!collapsed && (
				<LibraryItems
					source={source}
					library={library}
					container={element}
					getItemProps={getItemProps}
					placeItem={placeItem}
					ordering={ordering}
					reversed={reversed}
					prepareItemContent={prepareItemContent}
				/>
			)}
		</section>
	)
}
