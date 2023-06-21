import { Editor, useEditor } from '@tldraw/editor'
import { useValue } from '@tldraw/state'
import { compact } from '@tldraw/utils'
import React, { useMemo } from 'react'
import {
	TLUiMenuSchema,
	menuCustom,
	menuGroup,
	menuItem,
	menuSubmenu,
	showMenuPaste,
	useAllowGroup,
	useAllowUngroup,
} from './menuHelpers'
import { useActions } from './useActions'
import { useBreakpoint } from './useBreakpoint'
import { useCanRedo } from './useCanRedo'
import { useCanUndo } from './useCanUndo'
import { useHasLinkShapeSelected } from './useHasLinkShapeSelected'
import { useShowAutoSizeToggle } from './useShowAutoSizeToggle'

/** @public */
export type TLUiMenuSchemaContextType = TLUiMenuSchema

/** @internal */
export const TLUiMenuSchemaContext = React.createContext({} as TLUiMenuSchemaContextType)

/** @public */
export type TLUiMenuSchemaProviderProps = {
	overrides?: (
		editor: Editor,
		schema: TLUiMenuSchemaContextType,
		helpers: {
			actions: ReturnType<typeof useActions>
			noneSelected: boolean
			oneSelected: boolean
			twoSelected: boolean
			threeSelected: boolean
		}
	) => TLUiMenuSchemaContextType
	children: any
}

/** @internal */
export function TLUiMenuSchemaProvider({ overrides, children }: TLUiMenuSchemaProviderProps) {
	const editor = useEditor()
	const actions = useActions()

	const breakpoint = useBreakpoint()
	const isMobile = breakpoint < 5

	const isDarkMode = useValue('isDarkMode', () => editor.isDarkMode, [editor])
	const animationSpeed = useValue('animationSpeed', () => editor.animationSpeed, [editor])
	const isGridMode = useValue('isGridMode', () => editor.isGridMode, [editor])
	const isSnapMode = useValue('isSnapMode', () => editor.isSnapMode, [editor])
	const isToolLock = useValue('isToolLock', () => editor.instanceState.isToolLocked, [editor])
	const isFocusMode = useValue('isFocusMode', () => editor.instanceState.isFocusMode, [editor])
	const isDebugMode = useValue('isDebugMode', () => editor.instanceState.isDebugMode, [editor])
	const exportBackground = useValue(
		'exportBackground',
		() => editor.instanceState.exportBackground,
		[editor]
	)

	const emptyPage = useValue('emptyPage', () => editor.currentPageShapeIds.size === 0, [editor])

	const selectedCount = useValue('selectedCount', () => editor.selectedIds.length, [editor])
	const noneSelected = selectedCount === 0
	const oneSelected = selectedCount > 0
	const twoSelected = selectedCount > 1
	const threeSelected = selectedCount > 2

	const hasClipboardWrite = Boolean(window.navigator.clipboard?.write)
	const showEditLink = useHasLinkShapeSelected()
	const showAutoSizeToggle = useShowAutoSizeToggle()
	const allowGroup = useAllowGroup()
	const allowUngroup = useAllowUngroup()
	const canUndo = useCanUndo()
	const canRedo = useCanRedo()
	const isZoomedTo100 = useValue('isZoomedTo100', () => editor.zoomLevel === 1, [editor])

	const menuSchema = useMemo<TLUiMenuSchema>(() => {
		const menuSchema = compact([
			menuGroup(
				'menu',
				menuSubmenu(
					'file',
					'menu.file',
					menuGroup('print', menuItem(actions['print'], { disabled: emptyPage }))
				),
				menuSubmenu(
					'edit',
					'menu.edit',
					menuGroup(
						'undo-actions',
						menuItem(actions['undo'], { disabled: !canUndo }),
						menuItem(actions['redo'], { disabled: !canRedo })
					),
					menuGroup(
						'clipboard-actions',
						menuItem(actions['cut'], { disabled: noneSelected }),
						menuItem(actions['copy'], { disabled: noneSelected }),
						menuItem(actions['paste'], { disabled: !showMenuPaste })
					),
					menuGroup(
						'conversions',
						menuSubmenu(
							'copy-as',
							'menu.copy-as',
							menuGroup(
								'copy-as-group',
								menuItem(actions['copy-as-svg'], { disabled: emptyPage }),
								menuItem(actions['copy-as-png'], { disabled: emptyPage || !hasClipboardWrite }),
								menuItem(actions['copy-as-json'], { disabled: emptyPage })
							),
							menuGroup(
								'export-bg',
								menuItem(actions['toggle-transparent'], { checked: !exportBackground })
							)
						),
						menuSubmenu(
							'export-as',
							'menu.export-as',
							menuGroup(
								'export-as-group',
								menuItem(actions['export-as-svg'], { disabled: emptyPage }),
								menuItem(actions['export-as-png'], { disabled: emptyPage }),
								menuItem(actions['export-as-json'], { disabled: emptyPage })
							),
							menuGroup(
								'export-bg',
								menuItem(actions['toggle-transparent'], { checked: !exportBackground })
							)
						)
					),
					menuGroup(
						'set-selection-group',
						menuItem(actions['select-all'], { disabled: emptyPage }),
						menuItem(actions['select-none'], { disabled: !oneSelected })
					),
					menuGroup(
						'selection',
						showAutoSizeToggle && menuItem(actions['toggle-auto-size']),
						showEditLink && menuItem(actions['edit-link']),
						menuItem(actions['duplicate'], { disabled: !oneSelected }),
						allowGroup && menuItem(actions['group']),
						allowUngroup && menuItem(actions['ungroup'])
					),
					menuGroup('delete-group', menuItem(actions['delete'], { disabled: !oneSelected }))
				),
				menuSubmenu(
					'view',
					'menu.view',
					menuGroup(
						'view-actions',
						menuItem(actions['zoom-in']),
						menuItem(actions['zoom-out']),
						menuItem(actions['zoom-to-100'], { disabled: isZoomedTo100 }),
						menuItem(actions['zoom-to-fit'], { disabled: emptyPage }),
						menuItem(actions['zoom-to-selection'], { disabled: emptyPage || !oneSelected })
					)
				)
			),
			menuGroup('extras', menuItem(actions['insert-embed']), menuItem(actions['insert-media'])),
			menuGroup(
				'preferences',
				menuSubmenu(
					'preferences',
					'menu.preferences',
					menuGroup(
						'preferences-actions',
						menuItem(actions['toggle-snap-mode'], { checked: isSnapMode }),
						menuItem(actions['toggle-tool-lock'], { checked: isToolLock }),
						menuItem(actions['toggle-grid'], { checked: isGridMode }),
						menuItem(actions['toggle-dark-mode'], { checked: isDarkMode }),
						menuItem(actions['toggle-focus-mode'], { checked: isFocusMode }),
						menuItem(actions['toggle-reduce-motion'], { checked: animationSpeed === 0 }),
						menuItem(actions['toggle-debug-mode'], { checked: isDebugMode })
					)
				),
				isMobile && menuCustom('LANGUAGE_MENU', { readonlyOk: true })
			),
		])

		if (overrides) {
			return overrides(editor, menuSchema, {
				actions,
				noneSelected,
				oneSelected,
				twoSelected,
				threeSelected,
			})
		}

		return menuSchema
	}, [
		editor,
		overrides,
		actions,
		oneSelected,
		twoSelected,
		threeSelected,
		emptyPage,
		isMobile,
		allowGroup,
		allowUngroup,
		showEditLink,
		hasClipboardWrite,
		showAutoSizeToggle,
		noneSelected,
		canUndo,
		canRedo,
		animationSpeed,
		isDarkMode,
		isGridMode,
		isSnapMode,
		isToolLock,
		isFocusMode,
		exportBackground,
		isDebugMode,
		isZoomedTo100,
	])

	return (
		<TLUiMenuSchemaContext.Provider value={menuSchema}>{children}</TLUiMenuSchemaContext.Provider>
	)
}

/** @public */
export function useMenuSchema(): TLUiMenuSchema {
	const ctx = React.useContext(TLUiMenuSchemaContext)

	if (!ctx) {
		throw new Error('useMenuSchema must be used inside of a TLUiMenuSchemaProvider.')
	}

	return ctx
}
