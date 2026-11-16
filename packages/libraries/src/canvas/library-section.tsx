import { type ButtonHTMLAttributes, useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, useValue } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import type { TLLibrary, TLLibraryItemId } from '../lib/schema'
import { LibraryMenu as DefaultLibraryMenu } from '../ui/library-menu'
import { getItemOrderChoice, itemOrderings, setItemOrderChoice } from './item-order'
import { useLibrariesComponentOverrides } from './libraries-components'
import { LibraryItems } from './library-items'
import { LibrarySectionHeader as DefaultLibrarySectionHeader } from './library-section-header'
import type { PrepareItemContent } from './save-shapes'
import { activeLibraryId, collapsedLibraryIds } from './state'
import { useLibraryActions } from './use-library-actions'

/** Unfolds and scrolls into view when it becomes the active library, e.g. from a toast's "Open". */
export function LibrarySection({
	source,
	library,
	getItemProps,
	prepareItemContent,
}: {
	source: LibrarySource
	library: TLLibrary
	getItemProps(itemId: TLLibraryItemId): ButtonHTMLAttributes<HTMLButtonElement>
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
	const collapsed = useValue(
		'library collapsed',
		() => collapsedLibraryIds.get(editor).includes(libraryId),
		[editor, libraryId]
	)
	const setCollapsed = (shut: boolean) =>
		collapsedLibraryIds.update(editor, (ids) => {
			const rest = ids.filter((id) => id !== libraryId)
			return shut ? [...rest, libraryId] : rest
		})
	const isActive = useValue('library active', () => activeLibraryId.get(editor) === libraryId, [
		editor,
		libraryId,
	])
	useEffect(() => {
		if (!isActive) return
		collapsedLibraryIds.update(editor, (ids) => ids.filter((id) => id !== libraryId))
		if (ref.current) ref.current.scrollIntoView({ block: 'nearest' })
		activeLibraryId.set(editor, null)
	}, [editor, isActive, libraryId])

	const choice = useValue('item order', () => getItemOrderChoice(source.id, libraryId), [
		source,
		libraryId,
	])
	const ordering = itemOrderings.find((o) => o.id === choice.orderingId) ?? itemOrderings[0]
	const sort = {
		options: itemOrderings.map(({ id, label }) => ({ id, label })),
		value: ordering.id,
		onValueChange: (orderingId: string) =>
			setItemOrderChoice(source.id, libraryId, { ...choice, orderingId }),
		reversed: choice.reversed,
		onReversedChange: (reversed: boolean) =>
			setItemOrderChoice(source.id, libraryId, { ...choice, reversed }),
	}

	return (
		<section ref={setRef} className="tlui-libraries-section">
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
								id={`libraries-library-menu-${libraryId}`}
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
					ordering={ordering}
					reversed={choice.reversed}
					prepareItemContent={prepareItemContent}
				/>
			)}
		</section>
	)
}
