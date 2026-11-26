import type { Editor } from '@tldraw/core'
import type { SvgExportContext } from '@tldraw/core'
import { promiseWithResolve } from '@tldraw/utils'
import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { ContainerProvider } from '../hooks/useContainer'
import { EditorProvider } from '../hooks/useEditor'
import { useEvent } from '../hooks/useEvent'

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
	const Provider = editor.options.exportProvider

	return (
		<EditorProvider editor={editor}>
			<ContainerProvider container={editor.getContainer()}>
				<Context.Provider value={context}>
					<Provider>{children}</Provider>
				</Context.Provider>
			</ContainerProvider>
		</EditorProvider>
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
