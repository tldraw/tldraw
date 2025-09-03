import { ReadonlySharedStyleMap, StyleProp, useEditor, useValue } from '@tldraw/editor'
import { createContext, useCallback, useContext } from 'react'
import { useUiEvents } from '../../context/events'

/** @public */
export interface StylePanelContext {
	styles: ReadonlySharedStyleMap
	showUiLabels: boolean
	onHistoryMark(id: string): void
	onValueChange<T>(style: StyleProp<T>, value: T): void
}
const StylePanelContext = createContext<null | StylePanelContext>(null)

/** @public */
export interface StylePanelContextProviderProps {
	children: React.ReactNode
	styles: ReadonlySharedStyleMap
}

/** @public @react */
export function StylePanelContextProvider({ children, styles }: StylePanelContextProviderProps) {
	const editor = useEditor()
	const trackEvent = useUiEvents()

	const onHistoryMark = useCallback((id: string) => editor.markHistoryStoppingPoint(id), [editor])
	const showUiLabels = useValue('showUiLabels', () => editor.user.getShowUiLabels(), [editor])
	const onValueChange = useCallback(
		function <T>(style: StyleProp<T>, value: T) {
			editor.run(() => {
				if (editor.isIn('select')) {
					editor.setStyleForSelectedShapes(style, value)
				}
				editor.setStyleForNextShapes(style, value)
				editor.updateInstanceState({ isChangingStyle: true })
			})

			trackEvent('set-style', { source: 'style-panel', id: style.id, value: value as string })
		},
		[editor, trackEvent]
	)

	return (
		<StylePanelContext.Provider
			value={{
				styles: styles,
				showUiLabels,
				onHistoryMark,
				onValueChange,
			}}
		>
			{children}
		</StylePanelContext.Provider>
	)
}

/** @public */
export function useStylePanelContext() {
	const context = useContext(StylePanelContext)
	if (!context) {
		throw new Error('useStylePanelContext must be used within a StylePanelContextProvider')
	}
	return context
}
