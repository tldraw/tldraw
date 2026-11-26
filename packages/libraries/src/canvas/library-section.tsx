import {
	type ButtonHTMLAttributes,
	type CSSProperties,
	type SyntheticEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import { useEditor, useValue, type TLLibrary, type TLLibraryItemId } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { getContextMenuHandlers, openContextMenu } from '../ui/context-menu'
import { LibraryMenu as DefaultLibraryMenu } from '../ui/library-menu'
import { useLibrariesComponentOverrides } from './libraries-components'
import { LibraryItems } from './library-items'
import { LibrarySectionHeader as DefaultLibrarySectionHeader } from './library-section-header'
import { useLongPress } from './long-press'
import { useHasBeenNearView } from './near-view'
import type { PrepareItemContent } from './save-shapes'
import { activeLibraryId, collapsedLibraryIds } from './state'
import { useItemOrdering } from './use-item-ordering'
import { useLibraryActions } from './use-library-actions'
import { useLibraryCollapsed } from './use-library-collapsed'

/** Unfolds and scrolls into view when it becomes the active library, e.g. from a toast's "Open". */
export function LibrarySection({
	source,
	library,
	depth = 0,
	getItemProps,
	placeItem,
	prepareItemContent,
}: {
	source: LibrarySource
	library: TLLibrary
	/** How many libraries it's inside, which indents it. */
	depth?: number
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

	const nearView = useHasBeenNearView(element)
	useEffect(() => {
		if (!collapsed && nearView && source.loadItems) source.loadItems(libraryId)
	}, [source, libraryId, collapsed, nearView])

	const { ordering, reversed } = useItemOrdering(source)
	const menuId = `libraries-library-menu-${libraryId}`
	const isFixedLibrary = useValue(
		'is fixed library',
		() => {
			if (!source.getLibraryPlacement) return false
			const placement = source.getLibraryPlacement(libraryId)
			return placement === 'document' || placement === 'default'
		},
		[source, libraryId]
	)
	const hasMenu = !!LibraryMenu && !isFixedLibrary
	const opensMenu = hasMenu && !isRenaming
	const contextMenu = getContextMenuHandlers((opener, point) =>
		openContextMenu(editor, menuId, { opener, point })
	)
	const headerPress = useLongPress(opensMenu)(() => openContextMenu(editor, menuId))
	const inHeader = (e: SyntheticEvent<HTMLElement>) => {
		const header = e.currentTarget.firstElementChild
		return !!header && header.contains(e.target as Node)
	}

	return (
		<section
			ref={setRef}
			className="tlui-libraries-section"
			style={depth > 0 ? ({ '--tlui-libraries-section-depth': depth } as CSSProperties) : undefined}
			{...headerPress}
			onPointerDown={(e) => {
				if (headerPress.onPointerDown && inHeader(e)) headerPress.onPointerDown(e)
			}}
			onContextMenu={(e) => {
				if (opensMenu && inHeader(e)) contextMenu.onContextMenu(e)
			}}
			onKeyDown={(e) => {
				if (opensMenu && inHeader(e)) contextMenu.onKeyDown(e)
			}}
		>
			{LibrarySectionHeader && (
				<LibrarySectionHeader
					source={source}
					library={library}
					collapsed={collapsed}
					onToggleCollapsed={() => setCollapsed(!collapsed)}
					menu={
						hasMenu && (
							<LibraryMenu source={source} library={library} id={menuId} {...menuActions} />
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
