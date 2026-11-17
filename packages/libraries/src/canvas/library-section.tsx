import {
	type ButtonHTMLAttributes,
	type CSSProperties,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import { useEditor, useValue, type TLLibraryItemId } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import type { TLLibraryTreeNode } from '../lib/libraryTree'
import { getItemOrderChoice, itemOrderings, setItemOrderChoice } from './item-order'
import { LibraryItems } from './library-items'
import { LibrarySectionHeader } from './library-section-header'
import type { PrepareItemContent } from './save-shapes'
import { activeLibraryId, collapsedLibraryIds } from './state'

/**
 * A library's items, then a section for each library inside it, folding shut together. Unfolds and
 * scrolls into view when it becomes the active library, e.g. from a toast's "Open", as do the
 * libraries it is inside.
 */
export function LibrarySection({
	source,
	node,
	getItemProps,
	prepareItemContent,
}: {
	source: LibrarySource
	node: TLLibraryTreeNode
	getItemProps(itemId: TLLibraryItemId): ButtonHTMLAttributes<HTMLButtonElement>
	prepareItemContent?: PrepareItemContent
}) {
	const { library, depth, children } = node
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
	const containsActive = useValue(
		'library contains active',
		() => {
			const activeId = activeLibraryId.get(editor)
			if (activeId === null || activeId === libraryId) return false
			const inside = (n: TLLibraryTreeNode): boolean =>
				n.children.some((child) => child.library.id === activeId || inside(child))
			return inside(node)
		},
		[editor, libraryId, node]
	)
	useEffect(() => {
		if (containsActive)
			collapsedLibraryIds.update(editor, (ids) => ids.filter((id) => id !== libraryId))
	}, [editor, containsActive, libraryId])
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
		<section
			ref={setRef}
			className="tlui-libraries-section"
			data-depth={depth}
			style={{ '--tl-library-depth': depth } as CSSProperties}
		>
			<LibrarySectionHeader
				source={source}
				library={library}
				collapsed={collapsed}
				onToggleCollapsed={() => setCollapsed(!collapsed)}
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
					hasChildren={children.length > 0}
				/>
			)}
			{!collapsed &&
				children.map((child) => (
					<LibrarySection
						key={child.library.id}
						source={source}
						node={child}
						getItemProps={getItemProps}
						prepareItemContent={prepareItemContent}
					/>
				))}
		</section>
	)
}
