import { type ReactNode, useEffect, useState } from 'react'
import {
	defineMessages,
	EditorPortal,
	useEditor,
	useTranslation,
	useValue,
	type TLLibrary,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { LibrariesPanelHeader } from './libraries-panel-header'
import { groupLibraryList, useLibraryGrouping } from './library-groups'
import { LibrarySection } from './library-section'
import { getTabValue, LibraryTabPanel, LibraryTabs } from './library-tabs'
import { useLibrariesEnabled } from './license'
import { canCreateNewLibrary, getDefaultOwnerId } from './new-library'
import { NoLibraries } from './no-libraries'
import type { PrepareItemContent } from './save-shapes'
import { activeLibraryId, librariesPanelOpen } from './state'
import { useCreateLibrary } from './use-create-library'
import { useItemDrag } from './use-item-drag'
import { usePickItem } from './use-pick-item'

const messages = defineMessages({
	title: { id: 'libraries.title', defaultMessage: 'Libraries' },
	newLibrary: { id: 'libraries.library-menu.create', defaultMessage: 'New library' },
	newLibraryIn: { id: 'libraries.group.new-library', defaultMessage: 'New library in {name}' },
})

/** @public */
export interface LibrariesPanelProps {
	source: LibrarySource
	/** Which side of the canvas the panel floats on. Defaults to `'left'`. */
	side?: 'left' | 'right'
	/**
	 * Items of the host's own for the panel's ⋯ menu, e.g. {@link LibraryMenuItem}s. Shown in a
	 * read-only editor too.
	 */
	menuItems?: ReactNode
	/** Changes an item's content before the panel's + saves it, e.g. {@link wrapInGroup}. */
	prepareItemContent?: PrepareItemContent
	/**
	 * Whether each library's ⋯ menu offers putting it in the current user's toolbar, or taking it
	 * out, for a host that shows {@link LibrariesToolbarItems}. Defaults to `false`.
	 */
	canPutInToolbar?: boolean
}

/**
 * A floating panel on one side of the canvas for browsing a {@link LibrarySource}, shown while
 * {@link librariesPanelOpen} is set. Each library is a section that folds shut; a source with
 * two or more owners shows a tab per owner, and "New library" in the header creates one for the
 * active tab's owner. Setting {@link activeLibraryId} switches to the tab holding that library.
 * Clicking an item arms it where the host has added {@link LibraryStampTool}, and the item shows
 * pressed while it stays armed: an item that stands for a tool arms that tool, any other arms the
 * stamp tool to place copies of it. Without the stamp tool, clicking places a copy in the middle of
 * the viewport. Dragging an item out drops a copy under the pointer.
 * @public @react
 */
export function LibrariesPanel({
	source,
	side = 'left',
	menuItems,
	prepareItemContent,
	canPutInToolbar = false,
}: LibrariesPanelProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const librariesEnabled = useLibrariesEnabled()
	const open = useValue('libraries panel open', () => librariesPanelOpen.get(editor), [editor])
	const libraries = useValue('libraries', () => source.getLibraries(), [source])
	const grouping = useLibraryGrouping(source)
	const pickItem = usePickItem(source)
	const getItemProps = useItemDrag(source, pickItem)
	const createLibrary = useCreateLibrary(source)
	const groups = groupLibraryList(libraries, grouping)
	const [chosenTab, setChosenTab] = useState<string>()
	const tab =
		chosenTab !== undefined && groups.some((group) => getTabValue(group.key) === chosenTab)
			? chosenTab
			: getTabValue(groups[0].key)
	const activeLibraryTab = useValue(
		'active library tab',
		() => {
			const library = source.getLibraries().find((l) => l.id === activeLibraryId.get(editor))
			return library && grouping ? getTabValue(grouping.keyOf(library)) : undefined
		},
		[editor, source, grouping]
	)
	useEffect(() => {
		if (activeLibraryTab !== undefined) setChosenTab(activeLibraryTab)
	}, [activeLibraryTab])
	const activeGroup = grouping ? groups.find((group) => getTabValue(group.key) === tab) : undefined
	const newLibraryOwnerId = activeGroup?.key
	const activeOwnerName = activeGroup?.label
	const newLibraryTarget = useValue(
		'new library target',
		() => {
			if (grouping) {
				if (newLibraryOwnerId === undefined) return undefined
				const allowed = source.can('createLibrary', { ownerId: newLibraryOwnerId })
				return allowed ? { ownerName: activeOwnerName } : undefined
			}
			if (!canCreateNewLibrary(source)) return undefined
			const defaultOwnerId = getDefaultOwnerId(source)
			const owners = source.getLibraryOwners ? source.getLibraryOwners() : []
			return { ownerName: owners.find((owner) => owner.id === defaultOwnerId)?.name }
		},
		[source, grouping, newLibraryOwnerId, activeOwnerName]
	)

	if (!librariesEnabled || !open) return null

	const renderSections = (list: TLLibrary[]) =>
		list.length === 0 ? (
			<NoLibraries />
		) : (
			list.map((library) => (
				<LibrarySection
					key={library.id}
					source={source}
					library={library}
					getItemProps={getItemProps}
					prepareItemContent={prepareItemContent}
					canPutInToolbar={canPutInToolbar}
				/>
			))
		)

	return (
		<EditorPortal>
			<section
				className="tlui-libraries-panel"
				data-side={side}
				aria-label={msg(messages.title)}
				onContextMenu={(e) => e.stopPropagation()}
			>
				<LibrariesPanelHeader
					newLibrary={
						newLibraryTarget && {
							label: newLibraryTarget.ownerName
								? msg(messages.newLibraryIn, { name: newLibraryTarget.ownerName })
								: msg(messages.newLibrary),
							onCreate: () => createLibrary(newLibraryOwnerId),
						}
					}
					menuItems={menuItems}
				/>
				{grouping ? (
					<LibraryTabs groups={groups} value={tab} onValueChange={setChosenTab}>
						{groups.map((group) => (
							<LibraryTabPanel key={getTabValue(group.key)} value={getTabValue(group.key)}>
								{renderSections(group.libraries)}
							</LibraryTabPanel>
						))}
					</LibraryTabs>
				) : (
					<div className="tlui-libraries-sections">{renderSections(libraries)}</div>
				)}
			</section>
		</EditorPortal>
	)
}
