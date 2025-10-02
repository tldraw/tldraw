import { ReadonlySharedStyleMap, StyleProp, useEditor, useValue } from '@tldraw/editor'
import { createContext, useCallback, useContext } from 'react'
import { useUiEvents } from '../../context/events'

/** @public */
export interface StylePanelContext {
	styles: ReadonlySharedStyleMap
	enhancedA11yMode: boolean
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
	const enhancedA11yMode = useValue('enhancedA11yMode', () => editor.user.getEnhancedA11yMode(), [
		editor,
	])
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
				enhancedA11yMode,
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
