import { App, TLBookmarkUtil, TLEmbedUtil, getEmbedInfo, useEditor } from '@tldraw/editor'
import React, { useMemo } from 'react'
import { track, useValue } from 'signia-react'
import {
	MenuSchema,
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
export type ContextMenuSchemaContextType = MenuSchema

/** @public */
export const ContextMenuSchemaContext = React.createContext({} as ContextMenuSchemaContextType)

/** @public */
export type ContextMenuSchemaProviderProps = {
	overrides?: (
		app: App,
		schema: ContextMenuSchemaContextType,
		helpers: {
			actions: ReturnType<typeof useActions>
			oneSelected: boolean
			twoSelected: boolean
			threeSelected: boolean
			showAutoSizeToggle: boolean
			showUngroup: boolean
			onlyFlippableShapeSelected: boolean
		}
	) => ContextMenuSchemaContextType
	children: any
}

/** @public */
export const ContextMenuSchemaProvider = track(function ContextMenuSchemaProvider({
	overrides,
	children,
}: ContextMenuSchemaProviderProps) {
	const app = useEditor()
	const actions = useActions()

	const showAutoSizeToggle = useShowAutoSizeToggle()

	const onlyFlippableShapeSelected = useOnlyFlippableShape()

	const selectedCount = app.selectedIds.length

	const oneSelected = selectedCount > 0
	const oneEmbedSelected = useValue(
		'oneEmbedSelected',
		() => {
			if (app.selectedIds.length !== 1) return false
			return app.selectedIds.some((selectedId) => {
				const shape = app.getShapeById(selectedId)
				return shape && app.isShapeOfType(shape, TLEmbedUtil) && shape.props.url
			})
		},
		[]
	)
	const oneEmbeddableBookmarkSelected = useValue(
		'oneEmbeddableBookmarkSelected',
		() => {
			if (app.selectedIds.length !== 1) return false
			return app.selectedIds.some((selectedId) => {
				const shape = app.getShapeById(selectedId)
				return shape && app.isShapeOfType(shape, TLBookmarkUtil) && getEmbedInfo(shape.props.url)
			})
		},
		[]
	)

	const twoSelected = selectedCount > 1
	const threeSelected = selectedCount > 2
	const threeStackableItems = useThreeStackableItems()
	const atLeastOneShapeOnPage = useValue('atLeastOneShapeOnPage', () => app.shapeIds.size > 0, [])
	const isTransparentBg = useValue('isTransparentBg', () => app.instanceState.exportBackground, [])
	const allowGroup = useAllowGroup()
	const allowUngroup = useAllowUngroup()
	const hasClipboardWrite = Boolean(window.navigator.clipboard?.write)
	const showEditLink = useHasLinkShapeSelected()
	const { onlySelectedShape } = app
	const isShapeLocked = onlySelectedShape && app.isShapeOrAncestorLocked(onlySelectedShape)

	const contextMenuSchema = useMemo<MenuSchema>(() => {
		let contextMenuSchema: ContextMenuSchemaContextType = compactMenuItems([
			menuGroup(
				'selection',
				oneEmbedSelected && menuItem(actions['open-embed-link']),
				oneEmbedSelected && !isShapeLocked && menuItem(actions['convert-to-bookmark']),
				oneEmbeddableBookmarkSelected && menuItem(actions['convert-to-embed']),
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
			contextMenuSchema = overrides(app, contextMenuSchema, {
				actions,
				oneSelected,
				twoSelected,
				threeSelected,
				showAutoSizeToggle,
				showUngroup: allowUngroup,
				onlyFlippableShapeSelected,
			})
		}

		return contextMenuSchema
	}, [
		app,
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
		oneEmbedSelected,
		oneEmbeddableBookmarkSelected,
		isTransparentBg,
		isShapeLocked,
	])

	return (
		<ContextMenuSchemaContext.Provider value={contextMenuSchema}>
			{children}
		</ContextMenuSchemaContext.Provider>
	)
})

/** @public */
export function useContextMenuSchema(): MenuSchema {
	const ctx = React.useContext(ContextMenuSchemaContext)

	if (!ctx) {
		throw new Error('useContextMenuSchema must be used inside of a ContextMenuSchemaProvider.')
	}

	return ctx
}
