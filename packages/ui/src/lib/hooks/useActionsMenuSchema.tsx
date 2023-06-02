import { App, useEditor } from '@tldraw/editor'
import React, { useMemo } from 'react'
import { track } from 'signia-react'
import {
	MenuSchema,
	menuItem,
	useAllowGroup,
	useAllowUngroup,
	useThreeStackableItems,
} from './menuHelpers'
import { useActions } from './useActions'
import { useBreakpoint } from './useBreakpoint'
import { useHasLinkShapeSelected } from './useHasLinkShapeSelected'

/** @public */
export type ActionsMenuSchemaContextType = MenuSchema

/** @public */
export const ActionsMenuSchemaContext = React.createContext({} as ActionsMenuSchemaContextType)

/** @public */
export type ActionsMenuSchemaProviderProps = {
	overrides?: (
		app: App,
		schema: ActionsMenuSchemaContextType,
		helpers: {
			actions: ReturnType<typeof useActions>
			oneSelected: boolean
			twoSelected: boolean
			threeSelected: boolean
		}
	) => ActionsMenuSchemaContextType
	children: any
}

/** @public */
export const ActionsMenuSchemaProvider = track(function ActionsMenuSchemaProvider({
	overrides,
	children,
}: ActionsMenuSchemaProviderProps) {
	const app = useEditor()
	const actions = useActions()

	const selectedCount = app.selectedIds.length

	const oneSelected = selectedCount > 0
	const twoSelected = selectedCount > 1
	const threeSelected = selectedCount > 2
	const threeStackableItems = useThreeStackableItems()
	const allowGroup = useAllowGroup()
	const allowUngroup = useAllowUngroup()
	const showEditLink = useHasLinkShapeSelected()
	const breakpoint = useBreakpoint()
	const isZoomedTo100 = app.zoomLevel === 1

	const actionMenuSchema = useMemo<MenuSchema>(() => {
		const results = [
			menuItem(actions['align-left'], { disabled: !twoSelected }),
			menuItem(actions['align-center-horizontal'], { disabled: !twoSelected }),
			menuItem(actions['align-right'], { disabled: !twoSelected }),
			menuItem(actions['stretch-horizontal'], { disabled: !twoSelected }),
			menuItem(actions['align-top'], { disabled: !twoSelected }),
			menuItem(actions['align-center-vertical'], { disabled: !twoSelected }),
			menuItem(actions['align-bottom'], { disabled: !twoSelected }),
			menuItem(actions['stretch-vertical'], { disabled: !twoSelected }),
			menuItem(actions['distribute-horizontal'], { disabled: !threeSelected }),
			menuItem(actions['distribute-vertical'], { disabled: !threeSelected }),
			menuItem(actions['stack-horizontal'], { disabled: !threeStackableItems }),
			menuItem(actions['stack-vertical'], { disabled: !threeStackableItems }),
			menuItem(actions['send-to-back'], { disabled: !oneSelected }),
			menuItem(actions['send-backward'], { disabled: !oneSelected }),
			menuItem(actions['bring-forward'], { disabled: !oneSelected }),
			menuItem(actions['bring-to-front'], { disabled: !oneSelected }),
			breakpoint < 5
				? menuItem(actions['zoom-to-100'], { disabled: !!isZoomedTo100 })
				: menuItem(actions['rotate-ccw'], { disabled: !oneSelected }),
			menuItem(actions['rotate-cw'], { disabled: !oneSelected }),
			menuItem(actions['edit-link'], { disabled: !showEditLink }),
			allowGroup
				? menuItem(actions['group'], { disabled: !twoSelected })
				: allowUngroup
				? menuItem(actions['ungroup'])
				: menuItem(actions['group'], { disabled: !twoSelected }),
		]

		if (overrides) {
			return overrides(app, results, { actions, oneSelected, twoSelected, threeSelected })
		}

		return results
	}, [
		app,
		isZoomedTo100,
		allowGroup,
		overrides,
		actions,
		oneSelected,
		twoSelected,
		threeSelected,
		threeStackableItems,
		allowUngroup,
		showEditLink,
		breakpoint,
	])

	return (
		<ActionsMenuSchemaContext.Provider value={actionMenuSchema}>
			{children}
		</ActionsMenuSchemaContext.Provider>
	)
})

/** @public */
export function useActionsMenuSchema(): MenuSchema {
	const ctx = React.useContext(ActionsMenuSchemaContext)

	if (!ctx) {
		throw new Error('useActionsMenuSchema must be used inside of a ActionsMenuSchemaProvider.')
	}

	return ctx
}
