import { type ReactNode, useCallback } from 'react'
import {
	defineMessages,
	EditorPortal,
	useEditor,
	useToasts,
	useTranslation,
	useValue,
	type TLLibrary,
	type TLLibraryItemId,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { LibrariesPanelHeader } from './libraries-panel-header'
import { LibraryGroupSection } from './library-group-section'
import { groupLibraryList, useLibraryGrouping } from './library-groups'
import { LibrarySection } from './library-section'
import { useLibrariesEnabled } from './license'
import { NoLibraries } from './no-libraries'
import { placeLibraryItem } from './place-item'
import type { PrepareItemContent } from './save-shapes'
import { librariesPanelOpen } from './state'
import { useItemDrag } from './use-item-drag'

const messages = defineMessages({
	title: { id: 'libraries.title', defaultMessage: 'Libraries' },
	placeErrorTitle: { id: 'libraries.place-error.title', defaultMessage: "Couldn't place item" },
	placeErrorDescription: {
		id: 'libraries.place-error.description',
		defaultMessage: 'It may have been deleted. Try again, or pick another item.',
	},
})

/** @public */
export interface LibrariesPanelProps {
	source: LibrarySource
	/** Which side of the canvas the panel floats on. Defaults to `'left'`. */
	side?: 'left' | 'right'
	/**
	 * Items of the host's own for the panel's ⋯ menu, placed after "New library", e.g.
	 * {@link LibraryMenuItem}s. Shown in a read-only editor too.
	 */
	menuItems?: ReactNode
	/**
	 * Items of the host's own for one library's ⋯ menu, e.g. a "Remove" for libraries the host
	 * lists by reference. Return nothing for libraries that need none.
	 */
	libraryMenuItems?(library: TLLibrary): ReactNode
	/** Changes an item's content before the panel's + saves it, e.g. {@link wrapInGroup}. */
	prepareItemContent?: PrepareItemContent
}

/**
 * A floating panel on one side of the canvas for browsing a {@link LibrarySource}, shown while
 * {@link librariesPanelOpen} is set. Each library is a section that folds shut; a source with
 * two or more owners groups them under each owner's name. Clicking an item places a copy of it in
 * the middle of the viewport; dragging one out drops it under the pointer.
 * @public @react
 */
export function LibrariesPanel({
	source,
	side = 'left',
	menuItems,
	libraryMenuItems,
	prepareItemContent,
}: LibrariesPanelProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const librariesEnabled = useLibrariesEnabled()
	const open = useValue('libraries panel open', () => librariesPanelOpen.get(editor), [editor])
	const libraries = useValue('libraries', () => source.getLibraries(), [source])
	const grouping = useLibraryGrouping(source)
	const placeItem = useCallback(
		(itemId: TLLibraryItemId) => {
			placeLibraryItem(editor, source, itemId).catch(() => {
				addToast({
					title: msg(messages.placeErrorTitle),
					description: msg(messages.placeErrorDescription),
					severity: 'error',
				})
			})
		},
		[editor, source, addToast, msg]
	)
	const getItemProps = useItemDrag(source, placeItem)

	if (!librariesEnabled || !open) return null

	return (
		<EditorPortal>
			<section
				className="tlui-libraries-panel"
				data-side={side}
				aria-label={msg(messages.title)}
				onContextMenu={(e) => e.stopPropagation()}
			>
				<LibrariesPanelHeader source={source} menuItems={menuItems} />
				{libraries.length === 0 ? (
					<NoLibraries />
				) : (
					<div className="tlui-libraries-sections">
						{groupLibraryList(libraries, grouping).map((group) => (
							<LibraryGroupSection key={group.key ?? ''} source={source} group={group}>
								{group.libraries.map((library) => (
									<LibrarySection
										key={library.id}
										source={source}
										library={library}
										getItemProps={getItemProps}
										menuItems={libraryMenuItems?.(library)}
										prepareItemContent={prepareItemContent}
									/>
								))}
							</LibraryGroupSection>
						))}
					</div>
				)}
			</section>
		</EditorPortal>
	)
}
