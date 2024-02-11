import { useEditor } from '@tldraw/editor'
import classNames from 'classnames'
import { memo, useCallback } from 'react'
import { useRelevantStyles } from '../../hooks/useRevelantStyles'
import { useTldrawUiComponents } from '../../hooks/useTldrawUiComponents'

/** @public */
export interface TLUiStylePanelProps {
	isMobile?: boolean
}

/** @public */
export const DefaultStylePanel = memo(function DefaultStylePanel({
	isMobile,
}: TLUiStylePanelProps) {
	const editor = useEditor()
	const { StylePanelContent } = useTldrawUiComponents()

	const relevantStyles = useRelevantStyles()

	const handlePointerOut = useCallback(() => {
		if (!isMobile) {
			editor.updateInstanceState({ isChangingStyle: false })
		}
	}, [editor, isMobile])

	if (!relevantStyles) return null
	if (!StylePanelContent) return null

	return (
		<div
			className={classNames('tlui-style-panel', { 'tlui-style-panel__wrapper': !isMobile })}
			data-ismobile={isMobile}
			onPointerLeave={handlePointerOut}
		>
			<StylePanelContent relevantStyles={relevantStyles} />
		</div>
	)
})
