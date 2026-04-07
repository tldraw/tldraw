import {
	ReadonlySharedStyleMap,
	useEditor,
	usePassThroughWheelEvents,
	useValue,
} from '@tldraw/editor'
import classNames from 'classnames'
import { ReactNode, memo, useEffect, useRef } from 'react'
import { useRelevantStyles } from '../../hooks/useRelevantStyles'
import { DefaultStylePanelContent } from './DefaultStylePanelContent'
import { StylePanelContextProvider } from './StylePanelContext'

/** @public */
export interface TLUiStylePanelProps {
	isMobile?: boolean
	styles?: ReadonlySharedStyleMap | null
	children?: ReactNode
}

/** @public @react */
export const DefaultStylePanel = memo(function DefaultStylePanel({
	isMobile,
	styles,
	children,
}: TLUiStylePanelProps) {
	const editor = useEditor()
	const enhancedA11yMode = useValue('enhancedA11yMode', () => editor.user.getEnhancedA11yMode(), [
		editor,
	])

	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)

	const defaultStyles = useRelevantStyles()
	if (styles === undefined) {
		styles = defaultStyles
	}

	useEffect(() => {
		const elm = ref.current as HTMLDivElement | null
		if (!elm) return

		function handlePointerMove(event: PointerEvent) {
			// Prevent pointer move events from propagating to the
			// canvas when the pointer is over the style panel.
			event.stopPropagation()
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (
				event.key === 'Escape' &&
				ref.current?.contains(editor.getContainerDocument().activeElement)
			) {
				event.stopPropagation()
				editor.getContainer().focus()
			}
		}

		elm.addEventListener('pointermove', handlePointerMove, { capture: true })
		elm.addEventListener('keydown', handleKeyDown, { capture: true })
		return () => {
			elm.removeEventListener('pointermove', handlePointerMove, { capture: true })
			elm.removeEventListener('keydown', handleKeyDown, { capture: true })
		}
	}, [editor])

	return (
		styles && (
			<div
				ref={ref}
				data-testid="style.panel"
				className={classNames('tlui-style-panel', { 'tlui-style-panel__wrapper': !isMobile })}
				data-ismobile={isMobile}
				data-enhanced-a11y-mode={enhancedA11yMode}
			>
				<StylePanelContextProvider styles={styles}>
					{children ?? <DefaultStylePanelContent />}
				</StylePanelContextProvider>
			</div>
		)
	)
})
