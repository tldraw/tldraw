import { useEditor } from '@tldraw/editor'
import classNames from 'classnames'
import { memo, useCallback } from 'react'
import { useRelevantStyles } from '../../hooks/useRelevantStyles'
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

	const styles = useRelevantStyles()

	const handlePointerOut = useCallback(() => {
		if (!isMobile) {
			editor.updateInstanceState({ isChangingStyle: false }, { ephemeral: true })
		}
	}, [editor, isMobile])

	const content = children ?? <DefaultStylePanelContent styles={styles} />

	return (
		<div
			className={classNames('tlui-style-panel', { 'tlui-style-panel__wrapper': !isMobile })}
			data-ismobile={isMobile}
			onPointerLeave={handlePointerOut}
		>
			{content}
		</div>
	)
})
