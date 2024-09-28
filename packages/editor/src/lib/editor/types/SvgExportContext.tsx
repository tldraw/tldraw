import { promiseWithResolve } from '@tldraw/utils'
import { ReactElement, ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { EditorContext } from '../../hooks/useEditor'
import { useEvent } from '../../hooks/useEvent'
import { Editor } from '../Editor'

/** @public */
export interface SvgExportDef {
	key: string
	getElement(): Promise<ReactElement | null> | ReactElement | null
}

/** @public */
export interface SvgExportContext {
	/**
	 * Add contents to the `<defs>` section of the export SVG. Each export def should have a unique
	 * key. If multiple defs come with the same key, only one will be added.
	 */
	addExportDef(def: SvgExportDef): void

	/**
	 * Cause the SVG export to be delayed until the returned promise is resolved. This is useful if
	 * e.g. your shape loads data dynamically, and you need to prevent the export from happening
	 * until after the data is loaded.
	 *
	 * See also the {@link useDelaySvgExport} hook, which may be a more convenient way to use this
	 * method depending on your use-case.
	 */
	waitUntil(promise: Promise<void>): void

	/**
	 * Whether the export should be in dark mode.
	 */
	readonly isDarkMode: boolean
}

const Context = createContext<SvgExportContext | null>(null)
export function SvgExportContextProvider({
	context,
	editor,
	children,
}: {
	context: SvgExportContext
	editor: Editor
	children: ReactNode
}) {
	return (
		<EditorContext.Provider value={editor}>
			<Context.Provider value={context}>{children}</Context.Provider>
		</EditorContext.Provider>
	)
}

/**
 * Returns the current SVG export context. Returns null if the component isn't being rendered for an
 * SVG export.
 *
 * @public
 */
export function useSvgExportContext() {
	return useContext(Context)
}

/**
 * Delay an SVG export until the returned function is called. This is useful if e.g. your shape
 * loads data dynamically, and you need to prevent the export from happening until after the data is
 * loaded.
 *
 * If used outside of an SVG export, this hook has no effect.
 *
 * @example
 * ```tsx
 * const readyForExport = useDelaySvgExport()
 *
 * return <MyDynamicComponent onDataLoaded={() => readyForExport()} />
 * ```
 *
 * @public
 */
export function useDelaySvgExport() {
	const ctx = useContext(Context)
	const [promise] = useState(promiseWithResolve<void>)

	useEffect(() => {
		ctx?.waitUntil(promise)
		return () => {
			promise.resolve()
		}
	}, [promise, ctx])

	return useEvent(() => {
		promise.resolve()
	})
}
