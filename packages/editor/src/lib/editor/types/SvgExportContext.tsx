import { ReactElement, ReactNode, createContext, useContext } from 'react'
import { EditorContext } from '../../hooks/useEditor'
import { Editor } from '../Editor'

/** @public */
export interface SvgExportDef {
	key: string
	getElement: () => Promise<ReactElement | null> | ReactElement | null
}

/** @public */
export interface SvgExportContext {
	/**
	 * Add contents to the `<defs>` section of the export SVG. Each export def should have a unique
	 * key. If multiple defs come with the same key, only one will be added.
	 */
	addExportDef(def: SvgExportDef): void

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
