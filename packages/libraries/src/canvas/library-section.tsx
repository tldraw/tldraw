import {
	type ButtonHTMLAttributes,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import { useEditor, useValue, type TLLibrary, type TLLibraryItemId } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { getItemOrderChoice, itemOrderings, setItemOrderChoice } from './item-order'
import { LibraryItems } from './library-items'
import { LibrarySectionHeader } from './library-section-header'
import type { PrepareItemContent } from './save-shapes'
import { activeLibraryId, collapsedLibraryIds } from './state'

/** Unfolds and scrolls into view when it becomes the active library, e.g. from a toast's "Open". */
export function LibrarySection({
	source,
	library,
	getItemProps,
	menuItems,
	prepareItemContent,
}: {
	source: LibrarySource
	library: TLLibrary
	getItemProps(itemId: TLLibraryItemId): ButtonHTMLAttributes<HTMLButtonElement>
	menuItems?: ReactNode
	prepareItemContent?: PrepareItemContent
}) {
	const editor = useEditor()
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

	return (
		<section ref={setRef} className="tlui-libraries-section">
			<LibrarySectionHeader
				source={source}
				library={library}
				collapsed={collapsed}
				onToggleCollapsed={() => setCollapsed(!collapsed)}
				menuItems={menuItems}
				sort={{
					options: itemOrderings.map(({ id, label }) => ({ id, label })),
					value: ordering.id,
					onValueChange: (orderingId) =>
						setItemOrderChoice(source.id, libraryId, { ...choice, orderingId }),
					reversed: choice.reversed,
					onReversedChange: (reversed) =>
						setItemOrderChoice(source.id, libraryId, { ...choice, reversed }),
				}}
			/>
			{!collapsed && (
				<LibraryItems
					source={source}
					libraryId={libraryId}
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
