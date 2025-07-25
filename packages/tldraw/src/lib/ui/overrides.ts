import { Editor, objectMapEntries, useMaybeEditor, useShallowArrayIdentity } from '@tldraw/editor'
import { createContext, useCallback, useContext, useMemo } from 'react'
import { PORTRAIT_BREAKPOINT } from './constants'
import { ActionsProviderProps, TLUiActionsContextType } from './context/actions'
import { useBreakpoint } from './context/breakpoints'
import { useDialogs } from './context/dialogs'
import { useToasts } from './context/toasts'
import { getLocalFiles } from './getLocalFiles'
import { useMenuClipboardEvents } from './hooks/useClipboardEvents'
import { useCopyAs } from './hooks/useCopyAs'
import { useExportAs } from './hooks/useExportAs'
import { useGetEmbedDefinition } from './hooks/useGetEmbedDefinition'
import { usePrint } from './hooks/usePrint'
import { TLUiToolsContextType, TLUiToolsProviderProps } from './hooks/useTools'
import { TLUiTranslationProviderProps, useTranslation } from './hooks/useTranslation/useTranslation'

export const MimeTypeContext = createContext<string[] | undefined>([])

/** @public */
export function useDefaultHelpers() {
	const editor = useMaybeEditor()
	const { addToast, removeToast, clearToasts } = useToasts()
	const { addDialog, clearDialogs, removeDialog } = useDialogs()

	const msg = useTranslation()
	const printSelectionOrPages = usePrint()
	const { cut, copy, paste } = useMenuClipboardEvents()
	const copyAs = useCopyAs()
	const exportAs = useExportAs()
	const getEmbedDefinition = useGetEmbedDefinition()

	// This is the only one that will change during runtime
	const breakpoint = useBreakpoint()
	const isMobile = breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM
	const mimeTypes = useShallowArrayIdentity(useContext(MimeTypeContext))

	const insertMedia = useCallback(async () => {
		if (!editor) return
		const files = await getLocalFiles({
			allowMultiple: true,
			mimeTypes,
		})
		if (!files.length) return
		editor.markHistoryStoppingPoint('insert media')
		editor.putExternalContent({
			type: 'files',
			files,
			point: editor.getViewportPageBounds().center,
		})
	}, [editor, mimeTypes])

	const replaceMedia = useCallback(
		async (isImage: boolean) => {
			if (!editor) return
			const files = await getLocalFiles({
				allowMultiple: false,
				mimeTypes: mimeTypes?.filter((m) =>
					isImage ? m.startsWith('image/') : m.startsWith('video/')
				),
			})
			if (!files.length) return
			const shape = editor.getOnlySelectedShape()
			if (!shape || (isImage && shape.type !== 'image') || (!isImage && shape.type !== 'video'))
				return

			editor.markHistoryStoppingPoint('replace media')

			const file = files[0]
			editor.replaceExternalContent({
				type: 'file-replace',
				file,
				shapeId: shape.id,
				isImage,
			})
		},
		[editor, mimeTypes]
	)

	const replaceImage = useCallback(() => replaceMedia(true /* isImage */), [replaceMedia])
	const replaceVideo = useCallback(() => replaceMedia(false /* isImage */), [replaceMedia])

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
			insertMedia,
			replaceImage,
			replaceVideo,
			printSelectionOrPages,
			cut,
			copy,
			paste,
			copyAs,
			exportAs,
			getEmbedDefinition,
		}),
		[
			addToast,
			removeToast,
			clearToasts,
			addDialog,
			removeDialog,
			clearDialogs,
			msg,
			isMobile,
			insertMedia,
			replaceImage,
			replaceVideo,
			printSelectionOrPages,
			cut,
			copy,
			paste,
			copyAs,
			exportAs,
			getEmbedDefinition,
		]
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
		helpers: TLUiOverrideHelpers
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
		actions: (editor, schema, helpers) => {
			for (const override of overrides) {
				if (override.actions) {
					schema = override.actions(editor, schema, helpers)
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
