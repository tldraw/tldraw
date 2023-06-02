import { Editor, useEditor } from '@tldraw/editor'
import { compact } from '@tldraw/utils'
import React, { useMemo } from 'react'
import { track } from 'signia-react'
import { KeyboardShortcutsDialog } from '../components/KeyboardShortcutsDialog'
import { MenuSchema, menuCustom, menuGroup, menuItem } from './menuHelpers'
import { useActions } from './useActions'
import { useDialogs } from './useDialogsProvider'
import { TLListedTranslations } from './useTranslation/translations'
import { useLanguages } from './useTranslation/useLanguages'

/** @public */
export type HelpMenuSchemaProviderType = MenuSchema

/** @internal */
export const HelpMenuSchemaContext = React.createContext({} as HelpMenuSchemaProviderType)

/** @public */
export type HelpMenuSchemaProviderProps = {
	overrides?: (
		app: Editor,
		schema: HelpMenuSchemaProviderType,
		helpers: {
			actions: ReturnType<typeof useActions>
			languages: TLListedTranslations
			currentLanguage: string
			oneSelected: boolean
			twoSelected: boolean
			threeSelected: boolean
		}
	) => HelpMenuSchemaProviderType
	children: any
}

/** @public */
export const HelpMenuSchemaProvider = track(function HelpMenuSchemaProvider({
	overrides,
	children,
}: HelpMenuSchemaProviderProps) {
	const app = useEditor()
	const actions = useActions()

	const selectedCount = app.selectedIds.length

	const oneSelected = selectedCount > 0
	const twoSelected = selectedCount > 1
	const threeSelected = selectedCount > 2

	const { languages, currentLanguage } = useLanguages()
	const { addDialog } = useDialogs()

	const helpMenuSchema = useMemo<MenuSchema>(() => {
		const helpMenuSchema = compact([
			menuGroup(
				'top',
				menuCustom('LANGUAGE_MENU', { readonlyOk: true }),
				menuItem({
					id: 'keyboard-shortcuts',
					label: 'help-menu.keyboard-shortcuts',
					readonlyOk: true,
					onSelect() {
						addDialog({ component: KeyboardShortcutsDialog })
					},
				})
			),
		])

		if (overrides) {
			return overrides(app, helpMenuSchema, {
				actions,
				currentLanguage,
				languages,
				oneSelected,
				twoSelected,
				threeSelected,
			})
		}

		return helpMenuSchema
	}, [
		app,
		overrides,
		languages,
		actions,
		oneSelected,
		twoSelected,
		threeSelected,
		currentLanguage,
		addDialog,
	])

	return (
		<HelpMenuSchemaContext.Provider value={helpMenuSchema}>
			{children}
		</HelpMenuSchemaContext.Provider>
	)
})

/** @public */
export function useHelpMenuSchema(): MenuSchema {
	const ctx = React.useContext(HelpMenuSchemaContext)

	if (!ctx) {
		throw new Error('useHelpMenuSchema must be used inside of a helpMenuSchemaProvider.')
	}

	return ctx
}
