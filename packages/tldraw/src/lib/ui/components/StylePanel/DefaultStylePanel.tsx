import { ReadonlySharedStyleMap, SharedStyle, useEditor } from '@tldraw/editor'
import classNames from 'classnames'
import { memo, useCallback } from 'react'
import { DefaultStylePanelContent } from './DefaultStylePanelContent'

/** @public */
export interface TLUiStylePanelProps {
	isMobile?: boolean
	children?: any
	relevantStyles: {
		styles: ReadonlySharedStyleMap
		opacity: SharedStyle<number>
	} | null
}

/** @public */
export const DefaultStylePanel = memo(function DefaultStylePanel({
	isMobile,
	children,
	relevantStyles,
}: TLUiStylePanelProps) {
	const editor = useEditor()

	const handlePointerOut = useCallback(() => {
		if (!isMobile) {
			editor.updateInstanceState({ isChangingStyle: false })
		}
	}, [editor, isMobile])

	if (!relevantStyles) return null

	const content = children ?? <DefaultStylePanelContent relevantStyles={relevantStyles} />

	return (
		<div
			className={classNames('', { 'tlui-style-panel__wrapper': !isMobile })}
			data-ismobile={isMobile}
			onPointerLeave={handlePointerOut}
		>
			<div className="tlui-style-panel">{content}</div>
		</div>
	)
})
