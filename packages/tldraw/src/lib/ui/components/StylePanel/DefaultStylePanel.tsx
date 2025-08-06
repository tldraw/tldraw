import { useEditor, usePassThroughWheelEvents, useValue } from '@tldraw/editor'
import classNames from 'classnames'
import { ReactNode, memo, useCallback, useEffect, useRef } from 'react'
import { useRelevantStyles } from '../../hooks/useRelevantStyles'
import { DefaultStylePanelContent } from './DefaultStylePanelContent'

/** @public */
export interface TLUiStylePanelProps {
	isMobile?: boolean
	children?: ReactNode
}

/** @public @react */
export const DefaultStylePanel = memo(function DefaultStylePanel({
	isMobile,
	children,
}: TLUiStylePanelProps) {
	const editor = useEditor()
	const showUiLabels = useValue('showUiLabels', () => editor.user.getShowUiLabels(), [editor])

	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)

	const styles = useRelevantStyles()

	const handlePointerOut = useCallback(() => {
		if (!isMobile) {
			editor.updateInstanceState({ isChangingStyle: false })
		}
	}, [editor, isMobile])

	const content = children ?? <DefaultStylePanelContent styles={styles} />

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
		<div
			ref={ref}
			className={classNames('tlui-style-panel', { 'tlui-style-panel__wrapper': !isMobile })}
			data-ismobile={isMobile}
			data-show-ui-labels={showUiLabels}
			onPointerLeave={handlePointerOut}
		>
			{content}
		</div>
	)
})
