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
 * Returns the read-only parts of {@link SvgExportContext}.
 * @public
 */
export function useSvgExportContext() {
	const ctx = useContext(Context)
	if (!ctx) return null
	return { isDarkMode: ctx.isDarkMode }
}

/**
 * Delay an SVG export until the returned function is called. Useful for waiting for async
 * operations and effects to complete before exporting.
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
