import { Editor, track, useEditor, useValue } from '@tldraw/editor'
import React, { useMemo } from 'react'
import {
	TLUiMenuSchema,
	compactMenuItems,
	menuCustom,
	menuGroup,
	menuItem,
	menuSubmenu,
	showMenuPaste,
	useAllowGroup,
	useAllowUngroup,
	useThreeStackableItems,
} from './menuHelpers'
import { useActions } from './useActions'
import { useHasLinkShapeSelected } from './useHasLinkShapeSelected'
import { useOnlyFlippableShape } from './useOnlyFlippableShape'
import { useShowAutoSizeToggle } from './useShowAutoSizeToggle'

/** @public */
export type TLUiContextTTLUiMenuSchemaContextType = TLUiMenuSchema

/** @internal */
export const TLUiContextMenuSchemaContext = React.createContext(
	{} as TLUiContextTTLUiMenuSchemaContextType
)

/** @public */
export type TLUiContextMenuSchemaProviderProps = {
	overrides?: (
		editor: Editor,
		schema: TLUiContextTTLUiMenuSchemaContextType,
		helpers: {
			actions: ReturnType<typeof useActions>
			oneSelected: boolean
			twoSelected: boolean
			threeSelected: boolean
			showAutoSizeToggle: boolean
			showUngroup: boolean
			onlyFlippableShapeSelected: boolean
		}
	) => TLUiContextTTLUiMenuSchemaContextType
	children: any
}

/** @internal */
export const TLUiContextMenuSchemaProvider = track(function TLUiContextMenuSchemaProvider({
	overrides,
	children,
}: TLUiContextMenuSchemaProviderProps) {
	const editor = useEditor()
	const actions = useActions()

	const showAutoSizeToggle = useShowAutoSizeToggle()

	const onlyFlippableShapeSelected = useOnlyFlippableShape()

	const selectedCount = editor.selectedShapeIds.length

	const oneSelected = selectedCount > 0

	const twoSelected = selectedCount > 1
	const threeSelected = selectedCount > 2
	const threeStackableItems = useThreeStackableItems()
	const atLeastOneShapeOnPage = useValue(
		'atLeastOneShapeOnPage',
		() => editor.currentPageShapeIds.size > 0,
		[]
	)
	const isTransparentBg = useValue(
		'isTransparentBg',
		() => editor.instanceState.exportBackground,
		[]
	)
	const allowGroup = useAllowGroup()
	const allowUngroup = useAllowUngroup()
	const hasClipboardWrite = Boolean(window.navigator.clipboard?.write)
	const showEditLink = useHasLinkShapeSelected()
	const { onlySelectedShape } = editor
	const isShapeLocked = onlySelectedShape && editor.isShapeOrAncestorLocked(onlySelectedShape)

	const contextTLUiMenuSchema = useMemo<TLUiMenuSchema>(() => {
		let contextTLUiMenuSchema: TLUiContextTTLUiMenuSchemaContextType = compactMenuItems([
			menuGroup(
				'selection',
				showAutoSizeToggle && menuItem(actions['toggle-auto-size']),
				showEditLink && !isShapeLocked && menuItem(actions['edit-link']),
				oneSelected && !isShapeLocked && menuItem(actions['duplicate']),
				allowGroup && !isShapeLocked && menuItem(actions['group']),
				allowUngroup && !isShapeLocked && menuItem(actions['ungroup']),
				oneSelected && menuItem(actions['toggle-lock'])
			),
			menuGroup(
				'modify',
				(twoSelected || onlyFlippableShapeSelected) &&
					menuSubmenu(
						'arrange',
						'context-menu.arrange',
						twoSelected &&
							menuGroup(
								'align',
								menuItem(actions['align-left']),
								menuItem(actions['align-center-horizontal']),
								menuItem(actions['align-right']),
								menuItem(actions['align-top']),
								menuItem(actions['align-center-vertical']),
								menuItem(actions['align-bottom'])
							),
						threeSelected &&
							menuGroup(
								'distribute',
								menuItem(actions['distribute-horizontal']),
								menuItem(actions['distribute-vertical'])
							),
						twoSelected &&
							menuGroup(
								'stretch',
								menuItem(actions['stretch-horizontal']),
								menuItem(actions['stretch-vertical'])
							),
						onlyFlippableShapeSelected &&
							!isShapeLocked &&
							menuGroup(
								'flip',
								menuItem(actions['flip-horizontal']),
								menuItem(actions['flip-vertical'])
							),
						twoSelected &&
							menuGroup(
								'order',
								menuItem(actions['pack'], { disabled: !twoSelected }),
								threeStackableItems && menuItem(actions['stack-vertical']),
								threeStackableItems && menuItem(actions['stack-horizontal'])
							)
					),
				oneSelected &&
					!isShapeLocked &&
					menuSubmenu(
						'reorder',
						'context-menu.reorder',
						menuGroup(
							'reorder',
							menuItem(actions['bring-to-front']),
							menuItem(actions['bring-forward']),
							menuItem(actions['send-backward']),
							menuItem(actions['send-to-back'])
						)
					),
				oneSelected && !isShapeLocked && menuCustom('MOVE_TO_PAGE_MENU', { readonlyOk: false })
			),
			menuGroup(
				'clipboard-group',
				oneSelected && !isShapeLocked && menuItem(actions['cut']),
				oneSelected && menuItem(actions['copy']),
				showMenuPaste && menuItem(actions['paste'])
			),
			atLeastOneShapeOnPage &&
				menuGroup(
					'conversions',
					menuSubmenu(
						'copy-as',
						'context-menu.copy-as',
						menuGroup(
							'copy-as-group',
							menuItem(actions['copy-as-svg']),
							hasClipboardWrite && menuItem(actions['copy-as-png']),
							menuItem(actions['copy-as-json'])
						),
						menuGroup(
							'export-bg',
							menuItem(actions['toggle-transparent'], { checked: !isTransparentBg })
						)
					),
					menuSubmenu(
						'export-as',
						'context-menu.export-as',
						menuGroup(
							'export-as-group',
							menuItem(actions['export-as-svg']),
							menuItem(actions['export-as-png']),
							menuItem(actions['export-as-json'])
						),
						menuGroup(
							'export-bg,',
							menuItem(actions['toggle-transparent'], { checked: !isTransparentBg })
						)
					)
				),
			atLeastOneShapeOnPage &&
				menuGroup(
					'set-selection-group',
					menuItem(actions['select-all']),
					oneSelected && menuItem(actions['select-none'])
				),
			oneSelected && !isShapeLocked && menuGroup('delete-group', menuItem(actions['delete'])),
		])

		if (overrides) {
			contextTLUiMenuSchema = overrides(editor, contextTLUiMenuSchema, {
				actions,
				oneSelected,
				twoSelected,
				threeSelected,
				showAutoSizeToggle,
				showUngroup: allowUngroup,
				onlyFlippableShapeSelected,
			})
		}

		return contextTLUiMenuSchema
	}, [
		editor,
		overrides,
		actions,
		oneSelected,
		twoSelected,
		threeSelected,
		showAutoSizeToggle,
		onlyFlippableShapeSelected,
		atLeastOneShapeOnPage,
		threeStackableItems,
		allowGroup,
		allowUngroup,
		hasClipboardWrite,
		showEditLink,
		// oneEmbedSelected,
		// oneEmbeddableBookmarkSelected,
		isTransparentBg,
		isShapeLocked,
	])

	return (
		<TLUiContextMenuSchemaContext.Provider value={contextTLUiMenuSchema}>
			{children}
		</TLUiContextMenuSchemaContext.Provider>
	)
})

/** @public */
export function useContextMenuSchema(): TLUiMenuSchema {
	const ctx = React.useContext(TLUiContextMenuSchemaContext)

	if (!ctx) {
		throw new Error('useContextMenuSchema must be used inside of a TLUiContextMenuSchemaProvider.')
	}

	return ctx
}
