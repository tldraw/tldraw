import { Editor, objectMapEntries } from '@tldraw/editor'
import { useMemo } from 'react'
import { ActionsProviderProps } from './hooks/useActions'
import { ActionsMenuSchemaProviderProps } from './hooks/useActionsMenuSchema'
import { useBreakpoint } from './hooks/useBreakpoint'
import { TLUiContextMenuSchemaProviderProps } from './hooks/useContextMenuSchema'
import { useDialogs } from './hooks/useDialogsProvider'
import { TLUiHelpMenuSchemaProviderProps } from './hooks/useHelpMenuSchema'
import { TLUiKeyboardShortcutsSchemaProviderProps } from './hooks/useKeyboardShortcutsSchema'
import { TLUiMenuSchemaProviderProps } from './hooks/useMenuSchema'
import { useToasts } from './hooks/useToastsProvider'
import { TLUiToolbarSchemaProviderProps } from './hooks/useToolbarSchema'
import { TLUiToolsProviderProps } from './hooks/useTools'
import { TLUiTranslationProviderProps, useTranslation } from './hooks/useTranslation/useTranslation'

/** @public */
export function useDefaultHelpers() {
	const { addToast, removeToast, clearToasts } = useToasts()
	const { addDialog, clearDialogs, removeDialog, updateDialog } = useDialogs()
	const breakpoint = useBreakpoint()
	const isMobile = breakpoint < 5
	const msg = useTranslation()
	return useMemo(
		() => ({
			addToast,
			removeToast,
			clearToasts,
			addDialog,
			clearDialogs,
			removeDialog,
			updateDialog,
			msg,
			isMobile,
		}),
		[
			addDialog,
			addToast,
			clearDialogs,
			clearToasts,
			msg,
			removeDialog,
			removeToast,
			updateDialog,
			isMobile,
		]
	)
}

type DefaultHelpers = ReturnType<typeof useDefaultHelpers>

export type TLUiOverride<Type, Helpers> = (editor: Editor, schema: Type, helpers: Helpers) => Type

type WithDefaultHelpers<T extends TLUiOverride<any, any>> = T extends TLUiOverride<
	infer Type,
	infer Helpers
>
	? TLUiOverride<Type, Helpers extends undefined ? DefaultHelpers : Helpers & DefaultHelpers>
	: never

/** @public */
export type TLUiOverrides = Partial<{
	actionsMenu: WithDefaultHelpers<NonNullable<ActionsMenuSchemaProviderProps['overrides']>>
	actions: WithDefaultHelpers<NonNullable<ActionsProviderProps['overrides']>>
	contextMenu: WithDefaultHelpers<NonNullable<TLUiContextMenuSchemaProviderProps['overrides']>>
	helpMenu: WithDefaultHelpers<NonNullable<TLUiHelpMenuSchemaProviderProps['overrides']>>
	menu: WithDefaultHelpers<NonNullable<TLUiMenuSchemaProviderProps['overrides']>>
	toolbar: WithDefaultHelpers<NonNullable<TLUiToolbarSchemaProviderProps['overrides']>>
	keyboardShortcutsMenu: WithDefaultHelpers<
		NonNullable<TLUiKeyboardShortcutsSchemaProviderProps['overrides']>
	>
	tools: WithDefaultHelpers<NonNullable<TLUiToolsProviderProps['overrides']>>
	translations: TLUiTranslationProviderProps['overrides']
}>

export type TLUiOverridesWithoutDefaults = Partial<{
	actionsMenu: ActionsMenuSchemaProviderProps['overrides']
	actions: ActionsProviderProps['overrides']
	contextMenu: TLUiContextMenuSchemaProviderProps['overrides']
	helpMenu: TLUiHelpMenuSchemaProviderProps['overrides']
	menu: TLUiMenuSchemaProviderProps['overrides']
	toolbar: TLUiToolbarSchemaProviderProps['overrides']
	keyboardShortcutsMenu: TLUiKeyboardShortcutsSchemaProviderProps['overrides']
	tools: TLUiToolsProviderProps['overrides']
	translations: TLUiTranslationProviderProps['overrides']
}>

export function mergeOverrides(
	overrides: TLUiOverrides[],
	defaultHelpers: DefaultHelpers
): TLUiOverridesWithoutDefaults {
	const mergedTranslations: TLUiTranslationProviderProps['overrides'] = {}
	for (const override of overrides) {
		if (override.translations) {
			for (const [key, value] of objectMapEntries(override.translations)) {
				let strings = mergedTranslations[key]
				if (!strings) {
					strings = mergedTranslations[key] = {}
				}
				Object.assign(strings, value)
			}
		}
	}
	return {
		actionsMenu: (editor, schema, helpers) => {
			for (const override of overrides) {
				if (override.actionsMenu) {
					schema = override.actionsMenu(editor, schema, { ...defaultHelpers, ...helpers })
				}
			}
			return schema
		},
		actions: (editor, schema) => {
			for (const override of overrides) {
				if (override.actions) {
					schema = override.actions(editor, schema, defaultHelpers)
				}
			}
			return schema
		},
		contextMenu: (editor, schema, helpers) => {
			for (const override of overrides) {
				if (override.contextMenu) {
					schema = override.contextMenu(editor, schema, { ...defaultHelpers, ...helpers })
				}
			}
			return schema
		},
		helpMenu: (editor, schema, helpers) => {
			for (const override of overrides) {
				if (override.helpMenu) {
					schema = override.helpMenu(editor, schema, { ...defaultHelpers, ...helpers })
				}
			}
			return schema
		},
		menu: (editor, schema, helpers) => {
			for (const override of overrides) {
				if (override.menu) {
					schema = override.menu(editor, schema, { ...defaultHelpers, ...helpers })
				}
			}
			return schema
		},
		toolbar: (editor, schema, helpers) => {
			for (const override of overrides) {
				if (override.toolbar) {
					schema = override.toolbar(editor, schema, { ...defaultHelpers, ...helpers })
				}
			}
			return schema
		},
		keyboardShortcutsMenu: (editor, schema, helpers) => {
			for (const override of overrides) {
				if (override.keyboardShortcutsMenu) {
					schema = override.keyboardShortcutsMenu(editor, schema, { ...defaultHelpers, ...helpers })
				}
			}
			return schema
		},
		tools: (editor, schema, helpers) => {
			for (const override of overrides) {
				if (override.tools) {
					schema = override.tools(editor, schema, { ...defaultHelpers, ...helpers })
				}
			}
			return schema
		},
		translations: mergedTranslations,
	}
}

function useShallowArrayEquality<T extends unknown[]>(array: T): T {
	// eslint-disable-next-line react-hooks/exhaustive-deps
	return useMemo(() => array, array)
}

export function useMergedTranslationOverrides(
	overrides?: TLUiOverrides[] | TLUiOverrides
): NonNullable<TLUiTranslationProviderProps['overrides']> {
	const overridesArray = useShallowArrayEquality(
		overrides == null ? [] : Array.isArray(overrides) ? overrides : [overrides]
	)
	return useMemo(() => {
		const mergedTranslations: TLUiTranslationProviderProps['overrides'] = {}
		for (const override of overridesArray) {
			if (override.translations) {
				for (const [key, value] of objectMapEntries(override.translations)) {
					let strings = mergedTranslations[key]
					if (!strings) {
						strings = mergedTranslations[key] = {}
					}
					Object.assign(strings, value)
				}
			}
		}
		return mergedTranslations
	}, [overridesArray])
}

export function useMergedOverrides(
	overrides?: TLUiOverrides[] | TLUiOverrides
): TLUiOverridesWithoutDefaults {
	const defaultHelpers = useDefaultHelpers()
	const overridesArray = useShallowArrayEquality(
		overrides == null ? [] : Array.isArray(overrides) ? overrides : [overrides]
	)
	return useMemo(
		() => mergeOverrides(overridesArray, defaultHelpers),
		[overridesArray, defaultHelpers]
	)
}
