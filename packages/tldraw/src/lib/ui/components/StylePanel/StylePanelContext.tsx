import {
	ReadonlySharedStyleMap,
	StyleProp,
	unsafe__withoutCapture,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { createContext, useCallback, useContext } from 'react'
import { useUiEvents } from '../../context/events'

/** @public */
export interface StylePanelValueChangeOptions {
	/**
	 * Whether this change starts a new undo step. Defaults to `true`. Pass `false` while a gesture
	 * is continuing (scrubbing across swatches, dragging a slider, a held key repeating) so the
	 * change extends the step begun on pointer down or the first key press.
	 */
	mark?: boolean
}

/** @public */
export interface StylePanelContext {
	styles: ReadonlySharedStyleMap
	enhancedA11yMode: boolean
	/**
	 * @deprecated `onValueChange` and `onOpacityChange` start their own undo step. Pass
	 * `{ mark: false }` to them to extend the current step instead.
	 */
	onHistoryMark(id: string): void
	onValueChange<T>(style: StyleProp<T>, value: T, opts?: StylePanelValueChangeOptions): void
	onOpacityChange(opacity: number, opts?: StylePanelValueChangeOptions): void
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
		function <T>(style: StyleProp<T>, value: T, opts?: StylePanelValueChangeOptions) {
			// If the user is holding down the accelerator key (Ctrl on Windows/Linux, Cmd on Mac)
			// while shapes are selected, interpret that as a wish to change the style for their
			// current selected shapes but not for the next shapes.
			const skipNextShapeStyle = unsafe__withoutCapture(
				() => editor.getSelectedShapeIds().length > 0 && editor.inputs.getAccelKey()
			)
			editor.run(
				() => {
					if (editor.isIn('select')) {
						editor.setStyleForSelectedShapes(style, value)
					}
					if (!skipNextShapeStyle) {
						editor.setStyleForNextShapes(style, value)
					}
					editor.updateInstanceState({ isChangingStyle: true })
				},
				{ mark: opts?.mark === false ? undefined : `set style ${style.id}` }
			)

			trackEvent('set-style', { source: 'style-panel', id: style.id, value: value as string })
		},
		[editor, trackEvent]
	)

	const onOpacityChange = useCallback(
		function (opacity: number, opts?: StylePanelValueChangeOptions) {
			const skipNextShapeStyle = unsafe__withoutCapture(
				() => editor.getSelectedShapeIds().length > 0 && editor.inputs.getAccelKey()
			)

			editor.run(
				() => {
					if (editor.isIn('select')) {
						editor.setOpacityForSelectedShapes(opacity)
					}
					if (!skipNextShapeStyle) {
						editor.setOpacityForNextShapes(opacity)
					}
					editor.updateInstanceState({ isChangingStyle: true })
				},
				{ mark: opts?.mark === false ? undefined : 'set opacity' }
			)

			trackEvent('set-style', { source: 'style-panel', id: 'opacity', value: opacity })
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
				onOpacityChange,
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
