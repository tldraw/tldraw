import { type ReactNode, useCallback, useEffect, useState } from 'react'
import {
	defineMessages,
	EditorPortal,
	useEditor,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import type { TLLibrary, TLLibraryItemId } from '../lib/schema'
import {
	type LibrariesComponents,
	LibrariesComponentsProvider,
	useLibrariesComponentOverrides,
} from './libraries-components'
import {
	LibrariesPanelHeader as DefaultLibrariesPanelHeader,
	type NewLibraryAction,
} from './libraries-panel-header'
import {
	getGroupOwner,
	groupLibraryList,
	type LibraryGroup,
	useLibraryGrouping,
} from './library-groups'
import { LibrarySection } from './library-section'
import { getTabValue, LibraryTabPanel, LibraryTabs } from './library-tabs'
import { canCreateNewLibrary, getDefaultOwnerId } from './new-library'
import { NoLibraries as DefaultNoLibraries } from './no-libraries'
import { placeLibraryItem } from './place-item'
import type { PrepareItemContent } from './save-shapes'
import { activeLibraryId, librariesPanelOpen } from './state'
import { useCreateLibrary } from './use-create-library'
import { useItemDrag } from './use-item-drag'

const messages = defineMessages({
	title: { id: 'libraries.title', defaultMessage: 'Libraries' },
	newLibrary: { id: 'libraries.library-menu.create', defaultMessage: 'New library' },
	newLibraryIn: { id: 'libraries.group.new-library', defaultMessage: 'New library in {name}' },
	placeErrorTitle: { id: 'libraries.place-error.title', defaultMessage: "Couldn't place item" },
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
	/** Replaces or hides pieces of the panel. See {@link LibrariesComponents}. */
	components?: LibrariesComponents
}

/**
 * A floating panel on one side of the canvas for browsing a {@link LibrarySource}, shown while
 * {@link librariesPanelOpen} is set. Each library is a section that folds shut; a source with
 * two or more owners shows a tab per owner, and "New library" in the header creates one for the
 * active tab's owner. Setting {@link activeLibraryId} switches to the tab holding that library.
 * Clicking an item places a copy of it in the middle of the viewport; dragging one out drops it
 * under the pointer.
 * @public @react
 */
export function LibrariesPanel({ components, ...props }: LibrariesPanelProps) {
	return (
		<LibrariesComponentsProvider components={components}>
			<LibrariesPanelContent {...props} />
		</LibrariesComponentsProvider>
	)
}

function LibrariesPanelContent({
	source,
	side = 'left',
	menuItems,
	prepareItemContent,
}: Omit<LibrariesPanelProps, 'components'>) {
	const editor = useEditor()
	const { LibrariesPanelHeader = DefaultLibrariesPanelHeader, NoLibraries = DefaultNoLibraries } =
		useLibrariesComponentOverrides()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const open = useValue('libraries panel open', () => librariesPanelOpen.get(editor), [editor])
	const libraries = useValue('libraries', () => source.getLibraries(), [source])
	const grouping = useLibraryGrouping(source)
	const placeItem = useCallback(
		(itemId: TLLibraryItemId) => {
			placeLibraryItem(editor, source, itemId).catch(() => {
				addToast({
					title: msg(messages.placeErrorTitle),
					severity: 'error',
				})
			})
		},
		[editor, source, addToast, msg]
	)
	const getItemProps = useItemDrag(source, placeItem)
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
	const creatableOwnerIds = useValue(
		'owners to create libraries for',
		() =>
			grouping ? grouping.order.filter((ownerId) => source.can('createLibrary', { ownerId })) : [],
		[source, grouping]
	)
	const ungroupedTarget = useValue(
		'new library target',
		() => {
			if (grouping || !canCreateNewLibrary(source)) return undefined
			const defaultOwnerId = getDefaultOwnerId(source)
			const owners = source.getLibraryOwners ? source.getLibraryOwners() : []
			return { ownerName: owners.find((owner) => owner.id === defaultOwnerId)?.name }
		},
		[source, grouping]
	)

	if (!open) return null

	const newLibraryAction = (ownerName: string | undefined, ownerId: string | undefined) => ({
		label: ownerName ? msg(messages.newLibraryIn, { name: ownerName }) : msg(messages.newLibrary),
		onCreate: () => createLibrary(ownerId),
	})
	const getNewLibrary = (group: LibraryGroup | undefined): NewLibraryAction | undefined => {
		if (!grouping) return ungroupedTarget && newLibraryAction(ungroupedTarget.ownerName, undefined)
		if (group?.key === undefined || !creatableOwnerIds.includes(group.key)) return undefined
		return newLibraryAction(group.label, group.key)
	}

	const renderSections = (list: TLLibrary[], group?: LibraryGroup) =>
		list.length === 0
			? NoLibraries && (
					<NoLibraries owner={group && getGroupOwner(group)} newLibrary={getNewLibrary(group)} />
				)
			: list.map((library) => (
					<LibrarySection
						key={library.id}
						source={source}
						library={library}
						getItemProps={getItemProps}
						prepareItemContent={prepareItemContent}
					/>
				))

	return (
		<EditorPortal>
			<section
				className="tlui-libraries-panel"
				data-side={side}
				aria-label={msg(messages.title)}
				onContextMenu={(e) => e.stopPropagation()}
			>
				{LibrariesPanelHeader && (
					<LibrariesPanelHeader newLibrary={getNewLibrary(activeGroup)} menuItems={menuItems} />
				)}
				{grouping ? (
					<LibraryTabs groups={groups} value={tab} onValueChange={setChosenTab}>
						{groups.map((group) => (
							<LibraryTabPanel key={getTabValue(group.key)} value={getTabValue(group.key)}>
								{renderSections(group.libraries, group)}
							</LibraryTabPanel>
						))}
					</LibraryTabs>
				) : (
					<div className="tlui-libraries-sections" onScroll={() => editor.menus.clearOpenMenus()}>
						{renderSections(libraries)}
					</div>
				)}
			</section>
		</EditorPortal>
	)
}
