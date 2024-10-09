import { Editor, objectMapEntries } from '@tldraw/editor'
import { useMemo } from 'react'
import { PORTRAIT_BREAKPOINT } from './constants'
import { ActionsProviderProps, TLUiActionsContextType } from './context/actions'
import { useBreakpoint } from './context/breakpoints'
import { useDialogs } from './context/dialogs'
import { useToasts } from './context/toasts'
import { TLUiToolsContextType, TLUiToolsProviderProps } from './hooks/useTools'
import { TLUiTranslationProviderProps, useTranslation } from './hooks/useTranslation/useTranslation'

/** @public */
export function useDefaultHelpers() {
	const { addToast, removeToast, clearToasts } = useToasts()
	const { addDialog, clearDialogs, removeDialog } = useDialogs()
	const breakpoint = useBreakpoint()
	const isMobile = breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM
	const msg = useTranslation()
	return useMemo(
		() => ({
			addToast,
			removeToast,
			clearToasts,
			addDialog,
			removeDialog,
			clearDialogs,
			msg,
			isMobile,
		}),
		[addDialog, addToast, clearDialogs, clearToasts, msg, removeDialog, removeToast, isMobile]
	)
}

/** @public */
export type TLUiOverrideHelpers = ReturnType<typeof useDefaultHelpers>

/** @public */
export interface TLUiOverrides {
	actions?(
		editor: Editor,
		actions: TLUiActionsContextType,
		helpers: TLUiOverrideHelpers
	): TLUiActionsContextType
	tools?(
		editor: Editor,
		tools: TLUiToolsContextType,
		helpers: { insertMedia(): void } & TLUiOverrideHelpers
	): TLUiToolsContextType
	translations?: TLUiTranslationProviderProps['overrides']
}

export interface TLUiOverridesWithoutDefaults {
	actions?: ActionsProviderProps['overrides']
	tools?: TLUiToolsProviderProps['overrides']
	translations?: TLUiTranslationProviderProps['overrides']
}

export function mergeOverrides(
	overrides: TLUiOverrides[],
	defaultHelpers: TLUiOverrideHelpers
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
		actions: (editor, schema) => {
			for (const override of overrides) {
				if (override.actions) {
					schema = override.actions(editor, schema, defaultHelpers)
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

/** @internal */
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
