import { Editor } from '@tldraw/editor'
import { objectMapEntries } from '@tldraw/utils'
import { useMemo } from 'react'
import { ActionsProviderProps } from './hooks/useActions'
import { ActionsMenuSchemaProviderProps } from './hooks/useActionsMenuSchema'
import { useBreakpoint } from './hooks/useBreakpoint'
import { ContextTLUiMenuSchemaProviderProps } from './hooks/useContextMenuSchema'
import { useDialogs } from './hooks/useDialogsProvider'
import { HelpMenuSchemaProviderProps } from './hooks/useHelpMenuSchema'
import { KeyboardShortcutsSchemaProviderProps } from './hooks/useKeyboardShortcutsSchema'
import { TLUiMenuSchemaProviderProps } from './hooks/useMenuSchema'
import { useToasts } from './hooks/useToastsProvider'
import { ToolbarSchemaProviderProps } from './hooks/useToolbarSchema'
import { ToolsProviderProps } from './hooks/useTools'
import { TranslationProviderProps, useTranslation } from './hooks/useTranslation/useTranslation'

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
export interface TLUiOverrides {
	actionsMenu?: WithDefaultHelpers<NonNullable<ActionsMenuSchemaProviderProps['overrides']>>
	actions?: WithDefaultHelpers<NonNullable<ActionsProviderProps['overrides']>>
	contextMenu?: WithDefaultHelpers<NonNullable<ContextTLUiMenuSchemaProviderProps['overrides']>>
	helpMenu?: WithDefaultHelpers<NonNullable<HelpMenuSchemaProviderProps['overrides']>>
	menu?: WithDefaultHelpers<NonNullable<TLUiMenuSchemaProviderProps['overrides']>>
	toolbar?: WithDefaultHelpers<NonNullable<ToolbarSchemaProviderProps['overrides']>>
	keyboardShortcutsMenu?: WithDefaultHelpers<
		NonNullable<KeyboardShortcutsSchemaProviderProps['overrides']>
	>
	tools?: WithDefaultHelpers<NonNullable<ToolsProviderProps['overrides']>>
	translations?: TranslationProviderProps['overrides']
}

export interface TLUiOverridesWithoutDefaults {
	actionsMenu?: ActionsMenuSchemaProviderProps['overrides']
	actions?: ActionsProviderProps['overrides']
	contextMenu?: ContextTLUiMenuSchemaProviderProps['overrides']
	helpMenu?: HelpMenuSchemaProviderProps['overrides']
	menu?: TLUiMenuSchemaProviderProps['overrides']
	toolbar?: ToolbarSchemaProviderProps['overrides']
	keyboardShortcutsMenu?: KeyboardShortcutsSchemaProviderProps['overrides']
	tools?: ToolsProviderProps['overrides']
	translations?: TranslationProviderProps['overrides']
}

export function mergeOverrides(
	overrides: TLUiOverrides[],
	defaultHelpers: DefaultHelpers
): TLUiOverridesWithoutDefaults {
	const mergedTranslations: TranslationProviderProps['overrides'] = {}
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
): NonNullable<TranslationProviderProps['overrides']> {
	const overridesArray = useShallowArrayEquality(
		overrides == null ? [] : Array.isArray(overrides) ? overrides : [overrides]
	)
	return useMemo(() => {
		const mergedTranslations: TranslationProviderProps['overrides'] = {}
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
