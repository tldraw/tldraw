import {
	ReadonlySharedStyleMap,
	useEditor,
	usePassThroughWheelEvents,
	useValue,
} from '@tldraw/editor'
import classNames from 'classnames'
import { ReactNode, memo, useCallback, useEffect, useRef } from 'react'
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

	const handlePointerOut = useCallback(() => {
		if (!isMobile) {
			editor.updateInstanceState({ isChangingStyle: false })
		}
	}, [editor, isMobile])

	const defaultStyles = useRelevantStyles()
	if (styles === undefined) {
		styles = defaultStyles
	}

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape' && ref.current?.contains(document.activeElement)) {
				event.stopPropagation()
				editor.getContainer().focus()
			}
		}

		const stylePanelContainerEl = ref.current
		stylePanelContainerEl?.addEventListener('keydown', handleKeyDown, { capture: true })
		return () => {
			stylePanelContainerEl?.removeEventListener('keydown', handleKeyDown, { capture: true })
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
				onPointerLeave={handlePointerOut}
			>
				<StylePanelContextProvider styles={styles}>
					{children ?? <DefaultStylePanelContent />}
				</StylePanelContextProvider>
			</div>
		)
	)
})
