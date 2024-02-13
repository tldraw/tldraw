import { useEditor } from '@tldraw/editor'
import classNames from 'classnames'
import { memo, useCallback } from 'react'
import { useRelevantStyles } from '../../hooks/useRevelantStyles'
import { DefaultStylePanelContent } from './DefaultStylePanelContent'

/** @public */
export interface TLUiStylePanelProps {
	isMobile?: boolean
	children?: any
}

/** @public */
export const DefaultStylePanel = memo(function DefaultStylePanel({
	isMobile,
	children,
}: TLUiStylePanelProps) {
	const editor = useEditor()

	const relevantStyles = useRelevantStyles()

	const handlePointerOut = useCallback(() => {
		if (!isMobile) {
			editor.updateInstanceState({ isChangingStyle: false })
		}
	}, [editor, isMobile])

	if (!relevantStyles) return null

	const Content = children ?? DefaultStylePanelContent
	if (!Content) return null

	return (
		<div
			className={classNames('tlui-style-panel', { 'tlui-style-panel__wrapper': !isMobile })}
			data-ismobile={isMobile}
			onPointerLeave={handlePointerOut}
		>
			<Content relevantStyles={relevantStyles} />
		</div>
	)
})
